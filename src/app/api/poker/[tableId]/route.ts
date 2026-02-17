import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { pokerTables, pokerGameHands, pokerTableSeats, pokerGameActions, pokerGameResults, users } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { processAction, startNewHand } from '@/lib/poker/gameLoop';
import { getSession } from '@/lib/auth/session';

const TURN_TIMEOUT_SECONDS = 30;

type HandState = {
  handId: string | null;
  handNumber: number;
  street: string | null;
  actionCount: number;
};

/**
 * Server-Sent Events endpoint for real-time poker game updates
 * Polls DB every 1 second and sends updates when state changes
 * Also enforces turn timeout: auto-folds players who exceed 30 seconds
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tableId: string }> }
) {
  const { tableId } = await params;

  // Get current user session for hole card visibility
  const session = await getSession();
  const currentUserId = session?.userId ?? null;

  const encoder = new TextEncoder();
  let lastState: HandState | null = null;
  let isProcessingTimeout = false;
  let isStartingHand = false;

  const stream = new ReadableStream({
    async start(controller) {
      // Send initial connection message
      const initData = JSON.stringify({ type: 'connected', timestamp: Date.now() });
      controller.enqueue(encoder.encode(`data: ${initData}\n\n`));

      if (!db) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'error', message: 'Database not available' })}\n\n`)
        );
        controller.close();
        return;
      }

      const pollInterval = setInterval(async () => {
        try {
          // Query current table state
          const table = await db
            .select()
            .from(pokerTables)
            .where(eq(pokerTables.id, tableId))
            .limit(1)
            .then((rows: any) => rows[0]);

          if (!table) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'error', message: 'Table not found' })}\n\n`)
            );
            clearInterval(pollInterval);
            controller.close();
            return;
          }

          // Auto-cleanup: delete empty tables after 10 minutes of inactivity
          const seatCount = await db
            .select({ count: sql`count(*)::int` })
            .from(pokerTableSeats)
            .where(eq(pokerTableSeats.tableId, tableId))
            .then((rows: any) => rows[0]?.count ?? 0);

          if (seatCount === 0 && table.lastActivityAt) {
            const inactiveMs = Date.now() - new Date(table.lastActivityAt).getTime();
            const TEN_MINUTES = 10 * 60 * 1000;
            if (inactiveMs >= TEN_MINUTES) {
              await db
                .update(pokerTables)
                .set({ status: 'closed' })
                .where(eq(pokerTables.id, tableId));
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'table_closed', reason: 'inactivity' })}\n\n`)
              );
              clearInterval(pollInterval);
              controller.close();
              return;
            }
          }

          // Auto-start hand if table is waiting with 2+ active players and no hand
          // Wait 3 seconds after hand completes before starting new one
          if (table.status === 'waiting' && !table.currentHandId && !isStartingHand) {
            if (table.lastActivityAt) {
              const timeSinceActivity = Date.now() - new Date(table.lastActivityAt).getTime();
              if (timeSinceActivity < 3000) return; // Skip this poll, wait for delay
            }

            const activePlayerCount = await db
              .select({ count: sql`count(*)::int` })
              .from(pokerTableSeats)
              .where(
                and(
                  eq(pokerTableSeats.tableId, tableId),
                  eq(pokerTableSeats.isActive, true),
                  eq(pokerTableSeats.isSittingOut, false)
                )
              )
              .then((rows: any) => rows[0]?.count ?? 0);

            if (activePlayerCount >= 2) {
              isStartingHand = true;
              try {
                await startNewHand(tableId);
              } catch (err) {
                console.error('Auto-start hand error:', err);
              } finally {
                isStartingHand = false;
              }
              return; // Skip this cycle, next poll picks up new state
            }
          }

          let currentState: HandState = {
            handId: table.currentHandId,
            handNumber: table.handCount,
            street: null,
            actionCount: 0,
          };

          let turnTimeLeft = TURN_TIMEOUT_SECONDS;

          // If there's an active hand, get its state and check timeout
          if (table.currentHandId) {
            const hand = await db
              .select()
              .from(pokerGameHands)
              .where(eq(pokerGameHands.id, table.currentHandId))
              .limit(1)
              .then((rows: any) => rows[0]);

            if (hand) {
              const actions = await db
                .select()
                .from(pokerGameActions)
                .where(eq(pokerGameActions.handId, hand.id));

              currentState.street = hand.status;
              currentState.actionCount = actions.length;

              // Calculate turn time remaining
              if (hand.currentSeat !== null && hand.turnStartedAt) {
                const elapsed = (Date.now() - new Date(hand.turnStartedAt).getTime()) / 1000;
                turnTimeLeft = Math.max(0, Math.ceil(TURN_TIMEOUT_SECONDS - elapsed));

                // Auto-fold if timeout exceeded
                if (elapsed >= TURN_TIMEOUT_SECONDS && !isProcessingTimeout) {
                  isProcessingTimeout = true;
                  try {
                    // Find the userId of the timed-out player
                    const [timedOutSeat] = await db
                      .select({ userId: pokerTableSeats.userId })
                      .from(pokerTableSeats)
                      .where(
                        and(
                          eq(pokerTableSeats.tableId, tableId),
                          eq(pokerTableSeats.seatNumber, hand.currentSeat)
                        )
                      )
                      .limit(1);

                    if (timedOutSeat) {
                      await processAction(tableId, timedOutSeat.userId, 'fold');
                    }
                  } catch (err) {
                    console.error('Auto-fold timeout error:', err);
                  } finally {
                    isProcessingTimeout = false;
                  }
                  return; // Skip this poll cycle, next one will pick up new state
                }
              }
            }
          }

          // Check if state changed
          const stateChanged =
            !lastState ||
            lastState.handId !== currentState.handId ||
            lastState.street !== currentState.street ||
            lastState.actionCount !== currentState.actionCount;

          if (stateChanged) {
            // Load full game state
            const seats = await db
              .select({
                seatNumber: pokerTableSeats.seatNumber,
                userId: pokerTableSeats.userId,
                chipStack: pokerTableSeats.chipStack,
                isActive: pokerTableSeats.isActive,
                isSittingOut: pokerTableSeats.isSittingOut,
                nickname: users.nickname,
              })
              .from(pokerTableSeats)
              .leftJoin(users, eq(pokerTableSeats.userId, users.id))
              .where(eq(pokerTableSeats.tableId, tableId));

            // Reconstruct bet/fold/allIn state from actions
            let seatBetState = new Map<number, { betInRound: number; totalBetInHand: number; isFolded: boolean; isAllIn: boolean }>();

            if (table.currentHandId) {
              const hand = await db
                .select()
                .from(pokerGameHands)
                .where(eq(pokerGameHands.id, table.currentHandId))
                .limit(1)
                .then((rows: any) => rows[0]);

              if (hand) {
                // Initialize all seats
                for (const seat of seats) {
                  seatBetState.set(seat.seatNumber, {
                    betInRound: 0,
                    totalBetInHand: 0,
                    isFolded: false,
                    isAllIn: false,
                  });
                }

                // Load actions and replay to reconstruct state
                const actions = await db
                  .select()
                  .from(pokerGameActions)
                  .where(eq(pokerGameActions.handId, hand.id))
                  .orderBy(pokerGameActions.createdAt);

                // Replay all actions to get totalBetInHand, isFolded, isAllIn
                for (const act of actions) {
                  const state = seatBetState.get(act.seatNumber);
                  if (!state) continue;

                  if (act.actionType === 'fold') {
                    state.isFolded = true;
                  } else if (['call', 'bet', 'raise', 'all_in', 'post_sb', 'post_bb'].includes(act.actionType)) {
                    state.totalBetInHand += act.amount;
                    if (act.actionType === 'all_in') {
                      state.isAllIn = true;
                    }
                  }
                }

                // Compute betInRound for current street only
                const currentStreetActions = actions.filter((a: any) => a.street === hand.status);
                for (const act of currentStreetActions) {
                  const state = seatBetState.get(act.seatNumber);
                  if (state && ['call', 'bet', 'raise', 'all_in', 'post_sb', 'post_bb'].includes(act.actionType)) {
                    state.betInRound += act.amount;
                  }
                }
              }
            }

            // Load hole cards for current hand
            let holeCardsMap = new Map<number, any>();
            if (table.currentHandId) {
              const results = await db
                .select({
                  seatNumber: pokerGameResults.seatNumber,
                  holeCards: pokerGameResults.holeCards,
                })
                .from(pokerGameResults)
                .where(eq(pokerGameResults.handId, table.currentHandId));

              for (const r of results) {
                holeCardsMap.set(r.seatNumber, r.holeCards);
              }
            }

            // Get current hand status for showdown visibility
            let currentHandStatus: string | null = null;
            if (table.currentHandId) {
              const handCheck = await db
                .select({ status: pokerGameHands.status })
                .from(pokerGameHands)
                .where(eq(pokerGameHands.id, table.currentHandId))
                .limit(1)
                .then((rows: any) => rows[0]);
              currentHandStatus = handCheck?.status ?? null;
            }

            const isShowdown = currentHandStatus === 'showdown' || currentHandStatus === 'complete';

            const seatsArray = new Array(table.maxSeats).fill(null);
            for (const seat of seats) {
              // Show hole cards: to card owner always, to everyone at showdown
              let holeCards = null;
              if (holeCardsMap.has(seat.seatNumber)) {
                if (seat.userId === currentUserId || isShowdown) {
                  holeCards = holeCardsMap.get(seat.seatNumber);
                }
              }

              seatsArray[seat.seatNumber] = {
                seatNumber: seat.seatNumber,
                userId: seat.userId,
                nickname: seat.nickname,
                chipStack: seat.chipStack,
                isActive: seat.isActive,
                isSittingOut: seat.isSittingOut,
                holeCards,
                // Add game state fields
                betInRound: seatBetState.get(seat.seatNumber)?.betInRound ?? 0,
                totalBetInHand: seatBetState.get(seat.seatNumber)?.totalBetInHand ?? 0,
                isFolded: seatBetState.get(seat.seatNumber)?.isFolded ?? false,
                isAllIn: seatBetState.get(seat.seatNumber)?.isAllIn ?? false,
              };
            }

            let handData = null;
            if (table.currentHandId) {
              const hand = await db
                .select()
                .from(pokerGameHands)
                .where(eq(pokerGameHands.id, table.currentHandId))
                .limit(1)
                .then((rows: any) => rows[0]);

              if (hand) {
                const actions = await db
                  .select()
                  .from(pokerGameActions)
                  .where(eq(pokerGameActions.handId, hand.id))
                  .orderBy(pokerGameActions.createdAt);

                const lastAction = actions.length > 0 ? actions[actions.length - 1] : null;

                handData = {
                  id: hand.id,
                  handNumber: hand.handNumber,
                  dealerSeat: hand.dealerSeat,
                  status: hand.status,
                  communityCards: hand.communityCards || [],
                  pot: hand.potTotal,
                  currentSeat: hand.currentSeat,
                  currentBet: hand.currentBet,
                  minRaise: hand.minRaise,
                  turnTimeLeft,
                  lastAction: lastAction
                    ? {
                        seatNumber: lastAction.seatNumber,
                        action: lastAction.actionType,
                        amount: lastAction.amount,
                      }
                    : null,
                };
              }
            }

            const updateData = JSON.stringify({
              type: 'game_state',
              timestamp: Date.now(),
              table: {
                id: table.id,
                name: table.name,
                status: table.status,
                smallBlind: table.smallBlind,
                bigBlind: table.bigBlind,
              },
              seats: seatsArray,
              hand: handData,
            });

            controller.enqueue(encoder.encode(`data: ${updateData}\n\n`));
            lastState = currentState;
          } else {
            // Send heartbeat with turn time update
            const heartbeat = JSON.stringify({
              type: 'heartbeat',
              timestamp: Date.now(),
              turnTimeLeft,
            });
            controller.enqueue(encoder.encode(`data: ${heartbeat}\n\n`));
          }
        } catch (error) {
          console.error('SSE poll error:', error);
          const errorData = JSON.stringify({
            type: 'error',
            message: error instanceof Error ? error.message : 'Unknown error',
          });
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
        }
      }, 1000);

      // Cleanup on disconnect
      request.signal.addEventListener('abort', () => {
        clearInterval(pollInterval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

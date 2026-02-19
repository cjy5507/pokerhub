import { db } from '@/lib/db';
import {
  pokerTables,
  pokerTableSeats,
  pokerGameHands,
  pokerGameActions,
  pokerGameResults,
  users,
} from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { broadcastTableUpdate } from './broadcast';
import { PokerEngine } from './engine';
import { Deck } from './deck';
import { GameState, Card, SeatState, PlayerAction } from './types';

type ActionResult = {
  success: boolean;
  error?: string;
  state?: GameState;
  events?: string[];
};

/**
 * Convert DB seat records to SeatState array for PokerEngine
 */
function buildSeatsArray(
  dbSeats: any[],
  maxSeats: number,
  currentHandResults?: Map<number, Card[]>
): (SeatState | null)[] {
  const seats: (SeatState | null)[] = new Array(maxSeats).fill(null);

  for (const seat of dbSeats) {
    const holeCards = currentHandResults?.get(seat.seatNumber) || null;
    seats[seat.seatNumber] = {
      seatNumber: seat.seatNumber,
      userId: seat.userId,
      nickname: seat.user?.nickname || 'Unknown',
      chipStack: seat.chipStack,
      holeCards,
      betInRound: 0,
      totalBetInHand: 0,
      isFolded: false,
      isAllIn: false,
      isSittingOut: seat.isSittingOut,
      isActive: seat.isActive,
    };
  }

  return seats;
}

/**
 * Process a player action and update game state in DB
 * Main entry point for all gameplay logic
 */
export async function processAction(
  tableId: string,
  userId: string,
  action: PlayerAction,
  amount?: number
): Promise<ActionResult> {
  if (!db) return { success: false, error: 'Database not available' };
  try {
    const result = await db.transaction(async (tx: any) => {
      // 1. Load current game state
      const table = await tx
        .select()
        .from(pokerTables)
        .where(eq(pokerTables.id, tableId))
        .limit(1)
        .then((rows: any[]) => rows[0]);

      if (!table) {
        return { success: false, error: 'Table not found' };
      }

      if (!table.currentHandId) {
        return { success: false, error: 'No active hand' };
      }

      // Load current hand
      const hand = await tx
        .select()
        .from(pokerGameHands)
        .where(eq(pokerGameHands.id, table.currentHandId))
        .limit(1)
        .then((rows: any[]) => rows[0]);

      if (!hand || hand.status === 'complete') {
        return { success: false, error: 'Hand is not active' };
      }

      // Load seats
      const dbSeats = await tx
        .select({
          tableId: pokerTableSeats.tableId,
          seatNumber: pokerTableSeats.seatNumber,
          userId: pokerTableSeats.userId,
          chipStack: pokerTableSeats.chipStack,
          isActive: pokerTableSeats.isActive,
          isSittingOut: pokerTableSeats.isSittingOut,
          user: {
            nickname: users.nickname,
          },
        })
        .from(pokerTableSeats)
        .leftJoin(users, eq(pokerTableSeats.userId, users.id))
        .where(eq(pokerTableSeats.tableId, tableId));

      // Load hole cards for this hand
      const results = await tx
        .select()
        .from(pokerGameResults)
        .where(eq(pokerGameResults.handId, hand.id));

      const holeCardsMap = new Map<number, Card[]>();
      for (const result of results) {
        holeCardsMap.set(result.seatNumber, result.holeCards as Card[]);
      }

      // Find user's seat
      const userSeat = dbSeats.find((s: any) => s.userId === userId);
      if (!userSeat) {
        return { success: false, error: 'You are not seated at this table' };
      }

      // Rebuild seats array with hole cards
      const seatsArray = buildSeatsArray(dbSeats, table.maxSeats, holeCardsMap);

      // Restore bet amounts from actions in current hand
      const actions = await tx
        .select()
        .from(pokerGameActions)
        .where(eq(pokerGameActions.handId, hand.id))
        .orderBy(pokerGameActions.createdAt);

      // Reconstruct bet state from actions
      for (const act of actions) {
        const seat = seatsArray[act.seatNumber];
        if (!seat) continue;

        if (act.actionType === 'fold') {
          seat.isFolded = true;
        } else if (['call', 'bet', 'raise', 'all_in', 'post_sb', 'post_bb'].includes(act.actionType)) {
          seat.totalBetInHand += act.amount;
          if (seat.chipStack === 0) {
            seat.isAllIn = true;
          }
        }
      }

      // Determine current street bet amounts
      const streetActions = actions.filter((a: any) => a.street === hand.status);

      // Reset betInRound for current street (must run before currentBet calculation)
      for (const seat of seatsArray) {
        if (seat) seat.betInRound = 0;
      }
      for (const act of streetActions) {
        const seat = seatsArray[act.seatNumber];
        if (seat && ['call', 'bet', 'raise', 'all_in', 'post_sb', 'post_bb'].includes(act.actionType)) {
          seat.betInRound += act.amount;
        }
      }

      // Now calculate currentBet from betInRound (per-street max, not hand-total)
      let currentBet = 0;
      for (const seat of seatsArray) {
        if (seat) {
          currentBet = Math.max(currentBet, seat.betInRound);
        }
      }

      // Recompute actionClosedBySeat from action history
      let actionClosedBySeat: number | null = null;
      let closerHasActed = true;

      if (hand.status === 'preflop') {
        // Preflop: closer starts as BB
        actionClosedBySeat = hand.bigBlindSeat;
        closerHasActed = false;
      } else {
        // Postflop: closer is the last acting player before first-to-act
        // (i.e., walk backwards from the first-to-act position)
        const len = seatsArray.length;
        // Find first-to-act (first active non-folded non-allIn left of dealer)
        let firstToActSeat: number | null = null;
        for (let i = 1; i <= len; i++) {
          const idx = (hand.dealerSeat + i) % len;
          const s = seatsArray[idx];
          if (s && !s.isFolded && !s.isAllIn && s.isActive && !s.isSittingOut) {
            firstToActSeat = idx;
            break;
          }
        }
        if (firstToActSeat !== null) {
          for (let i = 1; i <= len; i++) {
            const idx = (firstToActSeat - i + len) % len;
            const s = seatsArray[idx];
            if (s && !s.isFolded && !s.isAllIn && s.isActive && !s.isSittingOut) {
              actionClosedBySeat = idx;
              break;
            }
          }
        }
        closerHasActed = false;
      }

      // Scan street actions for most recent aggressive action
      for (const act of streetActions) {
        if (['bet', 'raise', 'all_in'].includes(act.actionType)) {
          actionClosedBySeat = act.seatNumber;
          closerHasActed = true;
        }
        // Track closer's passive actions too (check, call, fold)
        if (act.seatNumber === actionClosedBySeat &&
            ['check', 'call', 'fold'].includes(act.actionType)) {
          closerHasActed = true;
        }
      }

      // If closer has folded or is all-in, advance to next active
      if (actionClosedBySeat !== null) {
        const closerSeat = seatsArray[actionClosedBySeat];
        if (closerSeat && (closerSeat.isFolded || closerSeat.isAllIn)) {
          for (let i = 1; i <= seatsArray.length; i++) {
            const idx = (actionClosedBySeat! + i) % seatsArray.length;
            const s = seatsArray[idx];
            if (s && !s.isFolded && !s.isAllIn && s.isActive && !s.isSittingOut) {
              actionClosedBySeat = idx;
              closerHasActed = true;
              break;
            }
          }
        }
      }

      // Build full GameState
      const gameState: GameState = {
        tableId: table.id,
        tableName: table.name,
        smallBlind: table.smallBlind,
        bigBlind: table.bigBlind,
        maxSeats: table.maxSeats,
        handId: hand.id,
        handNumber: hand.handNumber,
        street: hand.status as any,
        communityCards: (hand.communityCards as Card[]) || [],
        pot: hand.potTotal,
        sidePots: [],
        currentSeat: hand.currentSeat,
        currentBet: hand.currentBet,
        minRaise: hand.minRaise,
        dealerSeat: hand.dealerSeat,
        seats: seatsArray,
        lastAction: null,
        actionClosedBySeat,
        closerHasActed,
        turnTimeLeft: 30,
        turnStartedAt: hand.turnStartedAt?.toISOString() ?? null,
        status: table.status as any,
      };

      // 2. Validate action
      const engine = new PokerEngine();
      const validation = engine.validateAction(gameState, userSeat.seatNumber, {
        action,
        amount,
      });

      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      // 3. Apply action
      const { newState, events, isHandComplete } = engine.applyAction(
        gameState,
        userSeat.seatNumber,
        { action, amount }
      );

      // 4. Save action to DB
      await tx.insert(pokerGameActions).values({
        handId: hand.id,
        seatNumber: userSeat.seatNumber,
        street: gameState.street!,
        actionType: action,
        amount: amount || 0,
      });

      // 5. Update hand state
      const newCurrentSeat = newState.currentSeat !== undefined ? newState.currentSeat : gameState.currentSeat;
      await tx
        .update(pokerGameHands)
        .set({
          potTotal: newState.pot ?? gameState.pot,
          currentBet: newState.currentBet ?? gameState.currentBet,
          minRaise: newState.minRaise ?? gameState.minRaise,
          currentSeat: newCurrentSeat,
          status: newState.street ?? gameState.street,
          turnStartedAt: newCurrentSeat !== null ? new Date() : null,
        })
        .where(eq(pokerGameHands.id, hand.id));

      // 6. Update seat chip stacks (only changed seats)
      const updatedSeats = newState.seats || gameState.seats;
      for (const seat of updatedSeats) {
        if (seat) {
          const original = gameState.seats[seat.seatNumber];
          if (!original || original.chipStack !== seat.chipStack) {
            await tx
              .update(pokerTableSeats)
              .set({ chipStack: seat.chipStack })
              .where(
                and(
                  eq(pokerTableSeats.tableId, tableId),
                  eq(pokerTableSeats.seatNumber, seat.seatNumber)
                )
              );
          }
        }
      }

      // 7. If hand complete, resolve showdown
      if (isHandComplete) {
        const fullCC = (hand.fullCommunityCards as Card[]) || [];
        const mergedState = { ...gameState, ...newState } as GameState;
        const remainingPlayers = mergedState.seats.filter(
          (s: SeatState | null) => s !== null && !s.isFolded && s.isActive
        );

        if (remainingPlayers.length <= 1) {
          // Fold-win: engine already awarded pot in applyAction.
          // Just update results for the winner and mark hand complete.
          for (const result of results) {
            const seat = mergedState.seats[result.seatNumber];
            if (seat && !seat.isFolded) {
              const winnerSeat = mergedState.seats[result.seatNumber];
              await tx
                .update(pokerGameResults)
                .set({
                  chipChange: gameState.pot - (winnerSeat ? winnerSeat.totalBetInHand : 0),
                  isWinner: true,
                })
                .where(
                  and(
                    eq(pokerGameResults.handId, hand.id),
                    eq(pokerGameResults.seatNumber, result.seatNumber)
                  )
                );
            }
          }
        } else {
          // Multi-player showdown
          mergedState.communityCards = fullCC;

          const showdown = engine.resolveShowdown(mergedState, holeCardsMap);

          // Update results
          for (const result of showdown.results) {
            await tx
              .update(pokerGameResults)
              .set({
                chipChange: result.chipChange,
                isWinner: result.chipChange > 0,
                handRank: result.handRank,
              })
              .where(
                and(
                  eq(pokerGameResults.handId, hand.id),
                  eq(pokerGameResults.seatNumber, result.seatNumber)
                )
              );
          }

          // Update seat stacks with winnings
          for (const winner of showdown.winners) {
            const seat = updatedSeats[winner.seatNumber];
            if (seat) {
              await tx
                .update(pokerTableSeats)
                .set({ chipStack: seat.chipStack + winner.amount })
                .where(
                  and(
                    eq(pokerTableSeats.tableId, tableId),
                    eq(pokerTableSeats.seatNumber, winner.seatNumber)
                  )
                );
            }
          }
        }

        // Mark hand as complete, reveal all community cards
        await tx
          .update(pokerGameHands)
          .set({
            status: 'complete',
            communityCards: mergedState.communityCards,
            completedAt: new Date(),
            currentSeat: null,
          })
          .where(eq(pokerGameHands.id, hand.id));

        // Clear current hand and set table back to waiting
        await tx
          .update(pokerTables)
          .set({ currentHandId: null, status: 'waiting', lastActivityAt: new Date() })
          .where(eq(pokerTables.id, tableId));
      } else if (newState.currentSeat === null && newState.street !== 'showdown') {
        // Betting round complete, advance street using pre-dealt community cards
        const fullCC = (hand.fullCommunityCards as Card[]) || [];
        const currentStreet = newState.street || gameState.street;
        let newStreet: string;
        let revealedCards: Card[];

        switch (currentStreet) {
          case 'preflop':
            newStreet = 'flop';
            revealedCards = fullCC.slice(0, 3);
            break;
          case 'flop':
            newStreet = 'turn';
            revealedCards = fullCC.slice(0, 4);
            break;
          case 'turn':
            newStreet = 'river';
            revealedCards = fullCC.slice(0, 5);
            break;
          default:
            newStreet = 'showdown';
            revealedCards = fullCC.slice(0, 5);
            break;
        }

        // Reset betInRound for new street
        const seatsForNewStreet = (newState.seats || gameState.seats).map(
          (s: SeatState | null) => (s ? { ...s, betInRound: 0 } : null)
        );

        // Find first active player left of dealer for new street
        let firstToAct: number | null = null;
        if (newStreet !== 'showdown') {
          const len = seatsForNewStreet.length;
          for (let i = 1; i <= len; i++) {
            const idx = (gameState.dealerSeat + i) % len;
            const s = seatsForNewStreet[idx];
            if (s && !s.isFolded && !s.isAllIn && s.isActive && !s.isSittingOut) {
              firstToAct = idx;
              break;
            }
          }
        }

        // If no one can act but multiple players remain (all-in run-out),
        // auto-advance through remaining streets to showdown
        if (firstToAct === null) {
          const activeCount = (newState.seats || gameState.seats).filter(
            (s: SeatState | null) => s !== null && !s.isFolded && s.isActive && !s.isSittingOut
          ).length;

          if (activeCount > 1 && newStreet !== 'showdown') {
            let advStreet = newStreet;
            while (advStreet !== 'showdown' && advStreet !== 'river') {
              switch (advStreet) {
                case 'flop': advStreet = 'turn'; break;
                case 'turn': advStreet = 'river'; break;
                default: advStreet = 'showdown'; break;
              }
            }
            if (advStreet === 'river') {
              advStreet = 'showdown';
            }
            newStreet = advStreet;
            revealedCards = fullCC.slice(0, 5);
          }
        }

        if (newStreet === 'showdown') {
          // Resolve showdown immediately for all-in run-out
          const mergedState = { ...gameState, ...newState } as GameState;
          mergedState.communityCards = fullCC.slice(0, 5);
          mergedState.pot = newState.pot ?? gameState.pot;

          const showdown = engine.resolveShowdown(mergedState, holeCardsMap);

          for (const result of showdown.results) {
            await tx
              .update(pokerGameResults)
              .set({
                chipChange: result.chipChange,
                isWinner: result.chipChange > 0,
                handRank: result.handRank,
              })
              .where(
                and(
                  eq(pokerGameResults.handId, hand.id),
                  eq(pokerGameResults.seatNumber, result.seatNumber)
                )
              );
          }

          for (const winner of showdown.winners) {
            const seat = (newState.seats || gameState.seats)[winner.seatNumber];
            if (seat) {
              await tx
                .update(pokerTableSeats)
                .set({ chipStack: seat.chipStack + winner.amount })
                .where(
                  and(
                    eq(pokerTableSeats.tableId, tableId),
                    eq(pokerTableSeats.seatNumber, winner.seatNumber)
                  )
                );
            }
          }

          await tx
            .update(pokerGameHands)
            .set({
              status: 'complete',
              communityCards: fullCC.slice(0, 5),
              completedAt: new Date(),
              currentSeat: null,
            })
            .where(eq(pokerGameHands.id, hand.id));

          await tx
            .update(pokerTables)
            .set({ currentHandId: null, status: 'waiting', lastActivityAt: new Date() })
            .where(eq(pokerTables.id, tableId));
        } else {
          await tx
            .update(pokerGameHands)
            .set({
              status: newStreet,
              communityCards: revealedCards,
              currentSeat: firstToAct,
              currentBet: 0,
              minRaise: table.bigBlind,
              turnStartedAt: firstToAct !== null ? new Date() : null,
            })
            .where(eq(pokerGameHands.id, hand.id));
        }
      }

      return {
        success: true,
        state: { ...gameState, ...newState } as GameState,
        events: events.map((e) => e.type),
      };
    });

    // Broadcast after transaction commits
    if (result.success) {
      const event = result.events?.includes('hand_complete') ? 'hand_complete' : 'action';
      await broadcastTableUpdate(tableId, event);
    }

    return result;
  } catch (error) {
    console.error('Error processing action:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Start a new hand at the table
 * Called when enough players are seated and no hand is active
 */
export async function startNewHand(tableId: string): Promise<{ success: boolean; error?: string; handId?: string }> {
  if (!db) return { success: false, error: 'Database not available' };
  try {
    const result = await db.transaction(async (tx: any) => {
      const table = await tx
        .select()
        .from(pokerTables)
        .where(eq(pokerTables.id, tableId))
        .limit(1)
        .then((rows: any[]) => rows[0]);

      if (!table) {
        return { success: false, error: 'Table not found' };
      }

      if (table.currentHandId) {
        return { success: false, error: 'Hand already active' };
      }

      // Load seats
      const dbSeats = await tx
        .select({
          seatNumber: pokerTableSeats.seatNumber,
          userId: pokerTableSeats.userId,
          chipStack: pokerTableSeats.chipStack,
          isActive: pokerTableSeats.isActive,
          isSittingOut: pokerTableSeats.isSittingOut,
          user: {
            nickname: users.nickname,
          },
        })
        .from(pokerTableSeats)
        .leftJoin(users, eq(pokerTableSeats.userId, users.id))
        .where(
          and(
            eq(pokerTableSeats.tableId, tableId),
            eq(pokerTableSeats.isActive, true),
            eq(pokerTableSeats.isSittingOut, false)
          )
        );

      if (dbSeats.length < 2) {
        return { success: false, error: 'Need at least 2 active players' };
      }

      // Build seats array
      const seatsArray = buildSeatsArray(dbSeats, table.maxSeats);
      const activeSeats = seatsArray.filter((s): s is SeatState => s !== null);

      // Determine dealer (rotate from last hand)
      const lastHandNumber = table.handCount || 0;
      let dealerSeat: number = activeSeats[0].seatNumber;
      if (lastHandNumber === 0) {
        // First hand: pick first active seat as dealer
        dealerSeat = activeSeats[0].seatNumber;
      } else {
        // Find previous dealer from last completed hand
        const lastHand = await tx
          .select({ dealerSeat: pokerGameHands.dealerSeat })
          .from(pokerGameHands)
          .where(eq(pokerGameHands.tableId, table.id))
          .orderBy(desc(pokerGameHands.handNumber))
          .limit(1)
          .then((rows: any[]) => rows[0]);

        if (lastHand) {
          // Next active player after previous dealer
          const maxSeat = table.maxSeats;
          let found = false;
          for (let i = 1; i <= maxSeat; i++) {
            const idx = (lastHand.dealerSeat + i) % maxSeat;
            const s = seatsArray[idx];
            if (s && s.isActive && !s.isSittingOut) {
              dealerSeat = idx;
              found = true;
              break;
            }
          }
          if (!found) {
            dealerSeat = activeSeats[0].seatNumber;
          }
        } else {
          dealerSeat = activeSeats[0].seatNumber;
        }
      }

      // Start hand using engine
      const engine = new PokerEngine();
      const { deck, holeCards, gameState, events } = engine.startHand(
        activeSeats,
        dealerSeat,
        table.smallBlind,
        table.bigBlind
      );

      // Determine SB and BB seats from events
      const sbEvent = events.find(
        (e): e is { type: 'post_blind'; seatNumber: number; amount: number; blindType: 'small' | 'big' } =>
          e.type === 'post_blind' && e.blindType === 'small'
      );
      const bbEvent = events.find(
        (e): e is { type: 'post_blind'; seatNumber: number; amount: number; blindType: 'small' | 'big' } =>
          e.type === 'post_blind' && e.blindType === 'big'
      );

      if (!sbEvent || !bbEvent) {
        return { success: false, error: 'Failed to post blinds' };
      }

      // Pre-deal all 5 community cards from the same deck used for hole cards
      const fullCommunityCards = deck.deal(5);

      // Insert hand record
      const [hand] = await tx
        .insert(pokerGameHands)
        .values({
          tableId: table.id,
          handNumber: lastHandNumber + 1,
          dealerSeat,
          smallBlindSeat: sbEvent.seatNumber,
          bigBlindSeat: bbEvent.seatNumber,
          communityCards: [],
          fullCommunityCards,
          potTotal: gameState.pot || 0,
          status: 'preflop',
          currentSeat: gameState.currentSeat,
          currentBet: gameState.currentBet || table.bigBlind,
          minRaise: gameState.minRaise || table.bigBlind,
          turnStartedAt: new Date(),
        })
        .returning({ id: pokerGameHands.id });

      // Insert hole cards into results (with initial chipChange = 0)
      for (const [seatNum, cards] of holeCards.entries()) {
        await tx.insert(pokerGameResults).values({
          handId: hand.id,
          seatNumber: seatNum,
          holeCards: cards,
          chipChange: 0,
          isWinner: false,
        });
      }

      // Record blind actions
      await tx.insert(pokerGameActions).values([
        {
          handId: hand.id,
          seatNumber: sbEvent.seatNumber,
          street: 'preflop',
          actionType: 'post_sb',
          amount: sbEvent.amount,
        },
        {
          handId: hand.id,
          seatNumber: bbEvent.seatNumber,
          street: 'preflop',
          actionType: 'post_bb',
          amount: bbEvent.amount,
        },
      ]);

      // Update seat chip stacks (only blinds-deducted seats)
      const updatedSeats = gameState.seats || [];
      for (const seat of updatedSeats) {
        if (seat) {
          const originalSeat = dbSeats.find((ds: any) => ds.seatNumber === seat.seatNumber);
          if (!originalSeat || originalSeat.chipStack !== seat.chipStack) {
            await tx
              .update(pokerTableSeats)
              .set({ chipStack: seat.chipStack })
              .where(
                and(
                  eq(pokerTableSeats.tableId, tableId),
                  eq(pokerTableSeats.seatNumber, seat.seatNumber)
                )
              );
          }
        }
      }

      // Update table
      await tx
        .update(pokerTables)
        .set({
          currentHandId: hand.id,
          handCount: lastHandNumber + 1,
          status: 'playing',
        })
        .where(eq(pokerTables.id, tableId));

      return { success: true, handId: hand.id };
    });

    // Broadcast after transaction commits
    if (result.success) {
      await broadcastTableUpdate(tableId, 'hand_start');
    }

    return result;
  } catch (error) {
    console.error('Error starting new hand:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

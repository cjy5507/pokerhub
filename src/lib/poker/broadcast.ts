import { createAdminClient } from '@/lib/supabase/admin';
import { db } from '@/lib/db';
import {
  pokerTables,
  pokerTableSeats,
  users,
  pokerGameHands,
  pokerGameActions,
  pokerGameResults,
} from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import type { GameState, SeatState, PlayerAction } from '@/lib/poker/types';

export type PokerEvent =
  | 'action'
  | 'hand_start'
  | 'hand_complete'
  | 'player_join'
  | 'player_leave'
  | 'table_closed';

export async function broadcastTableUpdate(tableId: string, event: PokerEvent) {
  try {
    const supabase = createAdminClient();
    const channel = supabase.channel(`poker:${tableId}`);

    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => resolve(), 2000);
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          clearTimeout(timeout);
          resolve();
        }
      });
    });

    await channel.send({
      type: 'broadcast',
      event: 'state_changed',
      payload: { state: { event, timestamp: Date.now() } },
    });

    await supabase.removeChannel(channel);
  } catch (err) {
    console.error('Broadcast error:', err);
    // Non-fatal: clients will still get updates via SSE watchdog fallback
  }
}

/**
 * Build and broadcast full sanitized GameState to all clients on the table channel.
 * Hole cards are always null except during showdown/complete status.
 * Falls back silently on error — clients have fallback polling.
 */
export async function broadcastGameState(
  tableId: string,
  lastAction?: { seatNumber: number; action: string; amount: number } | null
): Promise<void> {
  if (!db) return;

  try {
    const tableRows = await db
      .select()
      .from(pokerTables)
      .where(eq(pokerTables.id, tableId))
      .limit(1);

    if (tableRows.length === 0) return;
    const t = tableRows[0];

    const seatsData = await db
      .select({
        seatNumber: pokerTableSeats.seatNumber,
        userId: pokerTableSeats.userId,
        chipStack: pokerTableSeats.chipStack,
        isActive: pokerTableSeats.isActive,
        isSittingOut: pokerTableSeats.isSittingOut,
        nickname: users.nickname,
      })
      .from(pokerTableSeats)
      .innerJoin(users, eq(pokerTableSeats.userId, users.id))
      .where(eq(pokerTableSeats.tableId, tableId));

    const seats: (SeatState | null)[] = Array.from({ length: t.maxSeats }, () => null);

    let currentHand = null;
    let results: any[] = [];
    let actions: any[] = [];

    if (t.currentHandId) {
      const handData = await db
        .select()
        .from(pokerGameHands)
        .where(eq(pokerGameHands.id, t.currentHandId))
        .limit(1);

      if (handData.length > 0) {
        currentHand = handData[0];

        results = await db
          .select()
          .from(pokerGameResults)
          .where(eq(pokerGameResults.handId, currentHand.id));

        actions = await db
          .select()
          .from(pokerGameActions)
          .where(eq(pokerGameActions.handId, currentHand.id))
          .orderBy(pokerGameActions.createdAt);
      }
    }

    // Build seats — hole cards only shown at showdown/complete
    const isShowdown =
      currentHand?.status === 'complete' || currentHand?.status === 'showdown';

    // Pre-compute folded seats from action history so the showdown reveal check
    // can correctly exclude folded players before the main loop sets isFolded.
    const foldedSeatNumbers = new Set<number>();
    if (currentHand && actions.length > 0) {
      for (const action of actions) {
        if (action.actionType === 'fold') {
          foldedSeatNumbers.add(action.seatNumber);
        }
      }
    }

    for (const s of seatsData) {
      const seatState: SeatState = {
        seatNumber: s.seatNumber,
        userId: s.userId,
        nickname: s.nickname,
        chipStack: s.chipStack,
        holeCards: null, // always null for broadcast (security)
        betInRound: 0,
        totalBetInHand: 0,
        isFolded: foldedSeatNumbers.has(s.seatNumber),
        isAllIn: false,
        isSittingOut: s.isSittingOut,
        isActive: s.isActive,
      };

      // Reveal hole cards only at showdown/complete for non-folded players
      if (isShowdown && currentHand && results.length > 0 && !seatState.isFolded) {
        const result = results.find((r) => r.seatNumber === s.seatNumber);
        if (result) {
          seatState.holeCards = result.holeCards;
        }
      }

      seats[s.seatNumber] = seatState;
    }

    // Reconstruct bet state from actions
    if (currentHand && actions.length > 0) {
      for (const action of actions) {
        const seat = seats[action.seatNumber];
        if (!seat) continue;

        if (action.actionType === 'fold') {
          seat.isFolded = true;
        } else if (
          ['call', 'bet', 'raise', 'all_in', 'post_sb', 'post_bb'].includes(action.actionType)
        ) {
          seat.totalBetInHand += action.amount;
          if (action.actionType === 'all_in') {
            seat.isAllIn = true;
          }
        }

        // betInRound for the current street
        if (action.street === currentHand.status) {
          if (
            ['call', 'bet', 'raise', 'all_in', 'post_sb', 'post_bb'].includes(action.actionType)
          ) {
            seat.betInRound += action.amount;
          }
        }
      }
    }

    const gameState: GameState = {
      tableId: t.id,
      tableName: t.name,
      smallBlind: t.smallBlind,
      bigBlind: t.bigBlind,
      maxSeats: t.maxSeats,
      handId: currentHand?.id || null,
      handNumber: currentHand?.handNumber || t.handCount,
      street: currentHand?.status || null,
      communityCards: currentHand?.communityCards || [],
      pot: currentHand?.potTotal || 0,
      sidePots: [],
      currentSeat: currentHand?.currentSeat ?? null,
      currentBet: currentHand?.currentBet ?? 0,
      minRaise: currentHand?.minRaise ?? t.bigBlind,
      dealerSeat: currentHand?.dealerSeat ?? 0,
      seats,
      lastAction: lastAction
        ? { seat: lastAction.seatNumber, action: lastAction.action as PlayerAction, amount: lastAction.amount }
        : null,
      actionClosedBySeat: null,
      turnTimeLeft: 30,
      turnStartedAt: currentHand?.turnStartedAt?.toISOString() ?? null,
      status:
        t.status === 'closed' ? 'paused' : (t.status as 'waiting' | 'playing' | 'paused'),
    };

    const supabase = createAdminClient();
    const channel = supabase.channel(`poker:${tableId}`);

    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => resolve(), 2000);
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          clearTimeout(timeout);
          resolve();
        }
      });
    });

    await channel.send({
      type: 'broadcast',
      event: 'game_state',
      payload: { state: gameState },
    });

    await supabase.removeChannel(channel);
  } catch (err) {
    console.error('broadcastGameState error:', err);
    // Non-fatal: clients fall back to SSE/polling
  }
}

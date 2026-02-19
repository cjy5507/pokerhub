import { createOptionalAdminClient } from '@/lib/supabase/admin';
import { db } from '@/lib/db';
import {
  pokerTables,
  pokerTableSeats,
  users,
  pokerGameHands,
  pokerGameActions,
  pokerGameResults,
} from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import type { GameState, SeatState, PlayerAction } from '@/lib/poker/types';
import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';

export type PokerEvent =
  | 'action'
  | 'hand_start'
  | 'hand_complete'
  | 'player_join'
  | 'player_leave'
  | 'table_closed';

type CachedBroadcastChannel = {
  supabase: SupabaseClient;
  channel: RealtimeChannel;
};

const SUBSCRIBE_TIMEOUT_MS = 2000;
const cachedChannels = new Map<string, Promise<CachedBroadcastChannel | null>>();

async function subscribeChannel(channel: RealtimeChannel): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const timeout = setTimeout(() => resolve(false), SUBSCRIBE_TIMEOUT_MS);
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        clearTimeout(timeout);
        resolve(true);
        return;
      }

      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        clearTimeout(timeout);
        resolve(false);
      }
    });
  });
}

async function getOrCreateChannel(tableId: string): Promise<CachedBroadcastChannel | null> {
  const cached = cachedChannels.get(tableId);
  if (cached) return cached;

  const pendingChannel = (async () => {
    const supabase = createOptionalAdminClient();
    if (!supabase) return null;

    const channel = supabase.channel(`poker:${tableId}`);
    const subscribed = await subscribeChannel(channel);
    if (!subscribed) {
      await supabase.removeChannel(channel);
      return null;
    }

    return { supabase, channel };
  })();

  cachedChannels.set(tableId, pendingChannel);

  try {
    const connected = await pendingChannel;
    if (!connected) {
      cachedChannels.delete(tableId);
    }
    return connected;
  } catch (error) {
    cachedChannels.delete(tableId);
    throw error;
  }
}

async function releaseChannel(tableId: string): Promise<void> {
  const cached = cachedChannels.get(tableId);
  if (!cached) return;
  cachedChannels.delete(tableId);

  const connected = await cached.catch(() => null);
  if (!connected) return;

  await connected.supabase.removeChannel(connected.channel);
}

async function sendBroadcast(
  tableId: string,
  event: 'state_changed' | 'game_state',
  payload: Record<string, unknown>
): Promise<void> {
  let connected = await getOrCreateChannel(tableId);
  if (!connected) return;

  let sendStatus = await connected.channel.send({
    type: 'broadcast',
    event,
    payload,
  });

  if (sendStatus === 'ok') return;

  await releaseChannel(tableId);
  connected = await getOrCreateChannel(tableId);
  if (!connected) return;

  sendStatus = await connected.channel.send({
    type: 'broadcast',
    event,
    payload,
  });

  if (sendStatus !== 'ok') {
    await releaseChannel(tableId);
    throw new Error(`Realtime broadcast failed (${event}): ${sendStatus}`);
  }
}

export async function broadcastTableUpdate(tableId: string, event: PokerEvent) {
  try {
    await sendBroadcast(tableId, 'state_changed', {
      state: { event, timestamp: Date.now() },
    });

    if (event === 'table_closed') {
      await releaseChannel(tableId);
    }
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
    let results: typeof pokerGameResults.$inferSelect[] = [];
    let actions: typeof pokerGameActions.$inferSelect[] = [];

    if (t.currentHandId) {
      const handData = await db
        .select()
        .from(pokerGameHands)
        .where(eq(pokerGameHands.id, t.currentHandId))
        .limit(1);

      if (handData.length > 0) {
        currentHand = handData[0];

        [results, actions] = await Promise.all([
          db
            .select()
            .from(pokerGameResults)
            .where(eq(pokerGameResults.handId, currentHand.id)),
          db
            .select()
            .from(pokerGameActions)
            .where(eq(pokerGameActions.handId, currentHand.id))
            .orderBy(pokerGameActions.createdAt),
        ]);
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
          seatState.holeCards = result.holeCards as SeatState['holeCards'];
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

    await sendBroadcast(tableId, 'game_state', { state: gameState });
  } catch (err) {
    console.error('broadcastGameState error:', err);
    // Non-fatal: clients fall back to SSE/polling
  }
}

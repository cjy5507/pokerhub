'use server';

import { db } from '@/lib/db';
import { pokerTables, pokerTableSeats, users, pokerGameHands, pokerGameActions, pokerGameResults } from '@/lib/db/schema';
import { getSession } from '@/lib/auth/session';
import { eq, sql, desc, ne, and } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import type { GameState, SeatState, PlayerAction } from '@/lib/poker/types';
import { processAction as processGameAction, startNewHand as startHand } from '@/lib/poker/gameLoop';

export type PokerTableWithSeats = {
  id: string;
  name: string;
  smallBlind: number;
  bigBlind: number;
  minBuyIn: number;
  maxBuyIn: number;
  maxSeats: number;
  status: 'waiting' | 'playing' | 'paused' | 'closed';
  handCount: number;
  createdAt: Date;
  seatCount: number;
};

/**
 * Get all poker tables that are not closed
 */
export async function getPokerTables(): Promise<PokerTableWithSeats[]> {
  if (!db) return [];

  // Cleanup old empty tables (older than 10 minutes with no players)
  await db.execute(sql`
    UPDATE poker_tables
    SET status = 'closed'
    WHERE status != 'closed'
    AND id NOT IN (SELECT DISTINCT table_id FROM poker_table_seats)
    AND last_activity_at < NOW() - INTERVAL '10 minutes'
  `);

  const tables = await db
    .select({
      id: pokerTables.id,
      name: pokerTables.name,
      smallBlind: pokerTables.smallBlind,
      bigBlind: pokerTables.bigBlind,
      minBuyIn: pokerTables.minBuyIn,
      maxBuyIn: pokerTables.maxBuyIn,
      maxSeats: pokerTables.maxSeats,
      status: pokerTables.status,
      handCount: pokerTables.handCount,
      createdAt: pokerTables.createdAt,
      seatCount: sql<number>`count(${pokerTableSeats.seatNumber})::int`,
    })
    .from(pokerTables)
    .leftJoin(pokerTableSeats, eq(pokerTables.id, pokerTableSeats.tableId))
    .where(ne(pokerTables.status, 'closed'))
    .groupBy(pokerTables.id)
    .orderBy(desc(pokerTables.createdAt));

  return tables;
}

type CreateTableData = {
  name: string;
  smallBlind: number;
  bigBlind: number;
  maxSeats: number;
};

/**
 * Create a new poker table
 */
export async function createPokerTable(data: CreateTableData) {
  if (!db) return { success: false, error: 'Database not available' };
  const session = await getSession();
  if (!session?.userId) {
    throw new Error('Unauthorized');
  }

  // Validation
  if (!data.name || data.name.length < 2 || data.name.length > 20) {
    throw new Error('테이블 이름은 2-20자여야 합니다');
  }

  if (data.smallBlind <= 0 || data.bigBlind <= 0) {
    throw new Error('블라인드는 0보다 커야 합니다');
  }

  const minBuyIn = data.bigBlind * 20;
  const maxBuyIn = data.bigBlind * 100;

  if (minBuyIn < data.bigBlind * 10) {
    throw new Error('최소 바이인은 빅블라인드의 10배 이상이어야 합니다');
  }

  if (maxBuyIn < minBuyIn) {
    throw new Error('최대 바이인은 최소 바이인 이상이어야 합니다');
  }

  // Create table
  const [table] = await db
    .insert(pokerTables)
    .values({
      name: data.name,
      smallBlind: data.smallBlind,
      bigBlind: data.bigBlind,
      minBuyIn,
      maxBuyIn,
      maxSeats: data.maxSeats,
      status: 'waiting',
    })
    .returning({ id: pokerTables.id });

  redirect(`/poker/${table.id}`);
}

/**
 * Get the current game state for a table
 */
export async function getTableState(tableId: string): Promise<GameState | null> {
  if (!db) return null;
  const session = await getSession();

  const table = await db
    .select()
    .from(pokerTables)
    .where(eq(pokerTables.id, tableId))
    .limit(1);

  if (table.length === 0) return null;

  const t = table[0];

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

  // Load current hand and results if exists
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

  // Build seats with hole cards and bet state
  for (const s of seatsData) {
    const seatState: SeatState = {
      seatNumber: s.seatNumber,
      userId: s.userId,
      nickname: s.nickname,
      chipStack: s.chipStack,
      holeCards: null,
      betInRound: 0,
      totalBetInHand: 0,
      isFolded: false,
      isAllIn: false,
      isSittingOut: s.isSittingOut,
      isActive: s.isActive,
    };

    // Add hole cards if authorized
    if (currentHand && results.length > 0) {
      const result = results.find((r) => r.seatNumber === s.seatNumber);
      if (result) {
        // Show hole cards only to owner or if hand is complete/showdown
        if (
          session?.userId === s.userId ||
          currentHand.status === 'complete' ||
          currentHand.status === 'showdown'
        ) {
          seatState.holeCards = result.holeCards;
        }
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
      } else if (['call', 'bet', 'raise', 'all_in', 'post_sb', 'post_bb'].includes(action.actionType)) {
        seat.totalBetInHand += action.amount;
        if (action.actionType === 'all_in') {
          seat.isAllIn = true;
        }
      }

      // Update betInRound for current street
      if (currentHand && action.street === currentHand.status) {
        if (['call', 'bet', 'raise', 'all_in', 'post_sb', 'post_bb'].includes(action.actionType)) {
          seat.betInRound += action.amount;
        }
      }
    }
  }

  return {
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
    currentSeat: currentHand?.currentSeat || null,
    currentBet: currentHand?.currentBet || 0,
    minRaise: currentHand?.minRaise || t.bigBlind,
    dealerSeat: currentHand?.dealerSeat || 0,
    seats,
    lastAction: null,
    actionClosedBySeat: null,
    turnTimeLeft: 30,
    status: t.status === 'closed' ? 'paused' : (t.status as 'waiting' | 'playing' | 'paused'),
  };
}

/**
 * Join a table at a specific seat
 */
export async function joinTable(tableId: string, seatNumber: number, buyIn: number) {
  if (!db) return { success: false, error: 'Database not available' };
  const session = await getSession();
  if (!session?.userId) {
    throw new Error('로그인이 필요합니다');
  }

  // Track whether we should auto-start after transaction commits
  let shouldStartHand = false;

  await db.transaction(async (tx: any) => {
    const table = await tx
      .select()
      .from(pokerTables)
      .where(eq(pokerTables.id, tableId))
      .limit(1);

    if (table.length === 0) throw new Error('테이블을 찾을 수 없습니다');

    const t = table[0];

    if (seatNumber < 0 || seatNumber >= t.maxSeats) {
      throw new Error('잘못된 좌석 번호입니다');
    }

    if (buyIn < t.minBuyIn || buyIn > t.maxBuyIn) {
      throw new Error(`바이인은 ${t.minBuyIn}~${t.maxBuyIn} 사이여야 합니다`);
    }

    // Check if seat is taken
    const existingSeat = await tx
      .select()
      .from(pokerTableSeats)
      .where(and(eq(pokerTableSeats.tableId, tableId), eq(pokerTableSeats.seatNumber, seatNumber)))
      .limit(1);

    if (existingSeat.length > 0) {
      throw new Error('이미 사용 중인 좌석입니다');
    }

    // Check if user is already at this table
    const userSeat = await tx
      .select()
      .from(pokerTableSeats)
      .where(and(eq(pokerTableSeats.tableId, tableId), eq(pokerTableSeats.userId, session.userId)))
      .limit(1);

    if (userSeat.length > 0) {
      throw new Error('이미 이 테이블에 앉아있습니다');
    }

    // Deduct points from user (atomic)
    const [user] = await tx
      .select({ points: users.points })
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);

    if (!user || user.points < buyIn) {
      throw new Error('포인트가 부족합니다');
    }

    await tx.update(users).set({ points: user.points - buyIn }).where(eq(users.id, session.userId));

    await tx.insert(pokerTableSeats).values({
      tableId,
      seatNumber,
      userId: session.userId,
      chipStack: buyIn,
      isActive: true,
      isSittingOut: false,
    });

    await tx.update(pokerTables).set({ lastActivityAt: new Date() }).where(eq(pokerTables.id, tableId));

    // Check if we should start a new hand (count within transaction)
    const seats = await tx
      .select()
      .from(pokerTableSeats)
      .where(
        and(
          eq(pokerTableSeats.tableId, tableId),
          eq(pokerTableSeats.isActive, true),
          eq(pokerTableSeats.isSittingOut, false)
        )
      );

    if (seats.length >= 2 && t.status === 'waiting' && !t.currentHandId) {
      shouldStartHand = true;
    }
  });

  // Start hand AFTER transaction commits so the new seat is visible
  if (shouldStartHand) {
    await startHand(tableId);
  }

  return { success: true };
}

/**
 * Leave the table
 */
export async function leaveTable(tableId: string) {
  if (!db) return { success: false, error: 'Database not available' };
  const session = await getSession();
  if (!session?.userId) {
    throw new Error('로그인이 필요합니다');
  }

  return await db.transaction(async (tx: any) => {
    const [seat] = await tx
      .select()
      .from(pokerTableSeats)
      .where(and(eq(pokerTableSeats.tableId, tableId), eq(pokerTableSeats.userId, session.userId)))
      .limit(1);

    if (!seat) {
      throw new Error('이 테이블에 앉아있지 않습니다');
    }

    // Return remaining chips to user points (atomic)
    const [user] = await tx
      .select({ points: users.points })
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);

    if (user) {
      await tx
        .update(users)
        .set({ points: user.points + seat.chipStack })
        .where(eq(users.id, session.userId));
    }

    await tx
      .delete(pokerTableSeats)
      .where(and(eq(pokerTableSeats.tableId, tableId), eq(pokerTableSeats.userId, session.userId)));

    await tx.update(pokerTables).set({ lastActivityAt: new Date() }).where(eq(pokerTables.id, tableId));

    // Check if we should pause the table
    const remainingSeats = await tx
      .select()
      .from(pokerTableSeats)
      .where(
        and(
          eq(pokerTableSeats.tableId, tableId),
          eq(pokerTableSeats.isActive, true),
          eq(pokerTableSeats.isSittingOut, false)
        )
      );

    if (remainingSeats.length < 2) {
      await tx
        .update(pokerTables)
        .set({ status: 'waiting', currentHandId: null })
        .where(eq(pokerTables.id, tableId));
    }

    return { success: true, chipsReturned: seat.chipStack };
  });
}

/**
 * Perform a game action (fold, check, call, bet, raise, all_in)
 */
export async function performAction(tableId: string, action: PlayerAction, amount?: number) {
  if (!db) return { success: false, error: 'Database not available' };
  const session = await getSession();
  if (!session?.userId) {
    throw new Error('로그인이 필요합니다');
  }

  try {
    const result = await processGameAction(tableId, session.userId, action, amount);

    if (!result.success) {
      throw new Error(result.error || 'Action failed');
    }

    return { success: true, action, amount };
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Unknown error');
  }
}

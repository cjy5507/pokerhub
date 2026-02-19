'use server';

import { db } from '@/lib/db';
import { pokerTables, pokerTableSeats, users, pokerGameHands, pokerGameActions, pokerGameResults, pointTransactions } from '@/lib/db/schema';
import { getSession } from '@/lib/auth/session';
import { eq, sql, desc, ne, and } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import type { GameState, SeatState, PlayerAction } from '@/lib/poker/types';
import { processAction as processGameAction, startNewHand as startHand } from '@/lib/poker/gameLoop';
import { broadcastTableUpdate, broadcastGameState } from '@/lib/poker/broadcast';

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
  activePlayers: number;
};

export type PokerLobbyData = {
  tables: PokerTableWithSeats[];
  myTableId: string | null;
};

/**
 * Get all poker tables that are not closed, plus the current user's table
 */
export async function getPokerTables(): Promise<PokerLobbyData> {
  if (!db) return { tables: [], myTableId: null };

  // Cleanup old empty tables (older than 10 minutes with no players)
  await db.execute(sql`
    UPDATE poker_tables
    SET status = 'closed'
    WHERE status != 'closed'
    AND id NOT IN (SELECT DISTINCT table_id FROM poker_table_seats)
    AND last_activity_at < NOW() - INTERVAL '10 minutes'
  `);

  // Check which table the current user is seated at
  let myTableId: string | null = null;
  const session = await getSession();
  if (session?.userId) {
    const mySeat = await db.select({ tableId: pokerTableSeats.tableId })
      .from(pokerTableSeats)
      .where(eq(pokerTableSeats.userId, session.userId))
      .limit(1);
    myTableId = mySeat[0]?.tableId ?? null;
  }

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
      activePlayers: sql<number>`count(${pokerTableSeats.seatNumber}) filter (where ${pokerTableSeats.isActive} = true and ${pokerTableSeats.isSittingOut} = false)::int`,
    })
    .from(pokerTables)
    .leftJoin(pokerTableSeats, eq(pokerTables.id, pokerTableSeats.tableId))
    .where(ne(pokerTables.status, 'closed'))
    .groupBy(pokerTables.id)
    .orderBy(desc(pokerTables.createdAt));

  return { tables, myTableId };
}

type CreateTableData = {
  name: string;
  smallBlind: number;
  bigBlind: number;
  ante: number;
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

  if (data.ante < 0) {
    throw new Error('앤티는 0 이상이어야 합니다');
  }
  if (data.ante > data.bigBlind) {
    throw new Error('앤티는 빅블라인드 이하여야 합니다');
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
      ante: data.ante,
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
    currentSeat: currentHand?.currentSeat ?? null,
    currentBet: currentHand?.currentBet ?? 0,
    minRaise: currentHand?.minRaise ?? t.bigBlind,
    dealerSeat: currentHand?.dealerSeat ?? 0,
    seats,
    lastAction: null,
    actionClosedBySeat: null,
    turnTimeLeft: 30,
    turnStartedAt: currentHand?.turnStartedAt?.toISOString() ?? null,
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

    // Deduct points from user (atomic single UPDATE)
    const result = await tx
      .update(users)
      .set({ points: sql`points - ${buyIn}` })
      .where(and(eq(users.id, session.userId), sql`points >= ${buyIn}`))
      .returning({ points: users.points });

    if (result.length === 0) {
      throw new Error('포인트가 부족합니다');
    }

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
  } else {
    await broadcastGameState(tableId);
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

  // Track whether the leaving player was the current-seat actor so we can
  // advance the turn via processGameAction AFTER the transaction commits.
  // processGameAction uses its own DB connection and cannot run inside a tx.
  let advanceTurnAfterTx: (() => Promise<void>) | null = null;

  const result = await db.transaction(async (tx: any) => {
    // 1. Read table + seat + active hand atomically
    const [table] = await tx
      .select()
      .from(pokerTables)
      .where(eq(pokerTables.id, tableId))
      .limit(1);

    const [seat] = await tx
      .select()
      .from(pokerTableSeats)
      .where(and(eq(pokerTableSeats.tableId, tableId), eq(pokerTableSeats.userId, session.userId)))
      .limit(1);

    if (!seat) {
      throw new Error('이 테이블에 앉아있지 않습니다');
    }

    // 2. If there is an active hand, insert fold action inside the transaction
    //    so the fold is atomic with seat removal (no window for another player
    //    to act on a seat that is about to disappear).
    if (table?.currentHandId) {
      const [hand] = await tx
        .select()
        .from(pokerGameHands)
        .where(eq(pokerGameHands.id, table.currentHandId))
        .limit(1);

      if (hand && hand.status !== 'complete') {
        // Record the fold action directly — works for both "my turn" and "not my turn"
        await tx.insert(pokerGameActions).values({
          handId: hand.id,
          seatNumber: seat.seatNumber,
          street: hand.status,
          actionType: 'fold',
          amount: 0,
        });

        if (hand.currentSeat === seat.seatNumber) {
          // Advance turn within this transaction (can't use processGameAction
          // post-tx because the seat will be deleted by then)
          const foldActions = await tx
            .select({ seatNumber: pokerGameActions.seatNumber })
            .from(pokerGameActions)
            .where(
              and(
                eq(pokerGameActions.handId, hand.id),
                eq(pokerGameActions.actionType, 'fold')
              )
            );
          const foldedSeatNumbers = new Set(foldActions.map((a: any) => a.seatNumber));

          // All active seats excluding the leaving player
          const allActiveSeats = await tx
            .select()
            .from(pokerTableSeats)
            .where(
              and(
                eq(pokerTableSeats.tableId, tableId),
                eq(pokerTableSeats.isActive, true),
                eq(pokerTableSeats.isSittingOut, false)
              )
            );
          const otherActiveSeats = allActiveSeats.filter((s: any) => s.userId !== session.userId);
          const nonFoldedSeats = otherActiveSeats.filter((s: any) => !foldedSeatNumbers.has(s.seatNumber));

          if (nonFoldedSeats.length <= 1) {
            // 0 or 1 non-folded player remains → complete the hand
            if (nonFoldedSeats.length === 1) {
              const winner = nonFoldedSeats[0];
              // Award pot to winner
              await tx
                .update(pokerTableSeats)
                .set({ chipStack: sql`chip_stack + ${hand.potTotal}` })
                .where(
                  and(
                    eq(pokerTableSeats.tableId, tableId),
                    eq(pokerTableSeats.seatNumber, winner.seatNumber)
                  )
                );
              // Calculate winner's total bet from actions
              const winnerBetActions = await tx
                .select({ amount: pokerGameActions.amount })
                .from(pokerGameActions)
                .where(
                  and(
                    eq(pokerGameActions.handId, hand.id),
                    eq(pokerGameActions.seatNumber, winner.seatNumber),
                    sql`${pokerGameActions.actionType} != 'fold'`
                  )
                );
              const winnerTotalBet = winnerBetActions.reduce((sum: number, a: any) => sum + a.amount, 0);
              await tx
                .update(pokerGameResults)
                .set({
                  chipChange: hand.potTotal - winnerTotalBet,
                  isWinner: true,
                })
                .where(
                  and(
                    eq(pokerGameResults.handId, hand.id),
                    eq(pokerGameResults.seatNumber, winner.seatNumber)
                  )
                );
            }
            await tx
              .update(pokerGameHands)
              .set({ status: 'complete', completedAt: new Date(), currentSeat: null })
              .where(eq(pokerGameHands.id, hand.id));
            await tx
              .update(pokerTables)
              .set({ status: 'waiting', currentHandId: null, lastActivityAt: new Date() })
              .where(eq(pokerTables.id, tableId));
          } else {
            // Multiple non-folded players remain → find next active seat
            const maxSeats = table?.maxSeats || 9;
            let nextSeat: number | null = null;
            for (let i = 1; i <= maxSeats; i++) {
              const idx = (seat.seatNumber + i) % maxSeats;
              const s = nonFoldedSeats.find((ns: any) => ns.seatNumber === idx);
              if (s && s.chipStack > 0) {
                nextSeat = idx;
                break;
              }
            }
            await tx
              .update(pokerGameHands)
              .set({
                currentSeat: nextSeat,
                turnStartedAt: nextSeat !== null ? new Date() : null,
              })
              .where(eq(pokerGameHands.id, hand.id));
          }
          // Turn handled within tx — skip post-tx processGameAction
          advanceTurnAfterTx = null;
        }
      }
    }

    // 3. Return remaining chips to user points (atomic)
    const [user] = await tx
      .select({ points: users.points })
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);

    if (user) {
      const updatedPoints = user.points + seat.chipStack;
      await tx
        .update(users)
        .set({ points: updatedPoints })
        .where(eq(users.id, session.userId));

      if (seat.chipStack > 0) {
        await tx.insert(pointTransactions).values({
          userId: session.userId,
          amount: seat.chipStack,
          balanceAfter: updatedPoints,
          type: 'earn_game',
          description: `포커 테이블 칩 반환 ${seat.chipStack}P`,
        });
      }
    }

    // 4. Remove the seat and update activity timestamp
    await tx
      .delete(pokerTableSeats)
      .where(and(eq(pokerTableSeats.tableId, tableId), eq(pokerTableSeats.userId, session.userId)));

    await tx.update(pokerTables).set({ lastActivityAt: new Date() }).where(eq(pokerTables.id, tableId));

    // 5. Check if we should pause the table
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
      // 현재 핸드가 있으면 완료 처리 (orphan 방지)
      // Re-fetch the table to check whether the hand was already completed
      // by the earlier "current actor leaving" block above.
      const [currentTable] = await tx.select().from(pokerTables).where(eq(pokerTables.id, tableId)).limit(1);
      if (currentTable.currentHandId) {
        // Fetch the hand to get potTotal and verify it isn't already complete
        const [activeHand] = await tx
          .select()
          .from(pokerGameHands)
          .where(eq(pokerGameHands.id, currentTable.currentHandId))
          .limit(1);

        if (activeHand && activeHand.status !== 'complete') {
          // Award the pot to the sole remaining player (if any)
          if (remainingSeats.length === 1) {
            const winner = remainingSeats[0];
            await tx
              .update(pokerTableSeats)
              .set({ chipStack: sql`chip_stack + ${activeHand.potTotal}` })
              .where(
                and(
                  eq(pokerTableSeats.tableId, tableId),
                  eq(pokerTableSeats.seatNumber, winner.seatNumber)
                )
              );
            // Calculate the winner's total contribution to the pot
            const winnerBetActions = await tx
              .select({ amount: pokerGameActions.amount })
              .from(pokerGameActions)
              .where(
                and(
                  eq(pokerGameActions.handId, activeHand.id),
                  eq(pokerGameActions.seatNumber, winner.seatNumber),
                  sql`${pokerGameActions.actionType} != 'fold'`
                )
              );
            const winnerTotalBet = winnerBetActions.reduce((sum: number, a: any) => sum + a.amount, 0);
            // Update game results for the winner (record exists from hand start)
            await tx
              .update(pokerGameResults)
              .set({
                chipChange: activeHand.potTotal - winnerTotalBet,
                isWinner: true,
              })
              .where(
                and(
                  eq(pokerGameResults.handId, activeHand.id),
                  eq(pokerGameResults.seatNumber, winner.seatNumber)
                )
              );
          }
          // Mark the hand as complete
          await tx
            .update(pokerGameHands)
            .set({ status: 'complete', completedAt: new Date(), currentSeat: null })
            .where(eq(pokerGameHands.id, activeHand.id));
        }
      }
      await tx
        .update(pokerTables)
        .set({ status: 'waiting', currentHandId: null })
        .where(eq(pokerTables.id, tableId));
      // No need to advance turn — hand is being closed
      advanceTurnAfterTx = null;
    }

    return { success: true, chipsReturned: seat.chipStack };
  });

  // Advance turn outside the transaction (processGameAction manages its own connection).
  // Cast needed: TypeScript narrows the let-binding to `never` after the async transaction boundary.
  const pendingTurnAdvance = advanceTurnAfterTx as (() => Promise<void>) | null;
  if (pendingTurnAdvance) {
    await pendingTurnAdvance();
  }

  await broadcastGameState(tableId);

  return result;
}

/**
 * Get the current user's hole cards for a table
 */
export async function getMyHoleCards(tableId: string): Promise<string[] | null> {
  if (!db) return null;
  const session = await getSession();
  if (!session?.userId) return null;

  const [seat] = await db.select({ seatNumber: pokerTableSeats.seatNumber })
    .from(pokerTableSeats)
    .where(and(
      eq(pokerTableSeats.tableId, tableId),
      eq(pokerTableSeats.userId, session.userId)
    ))
    .limit(1);
  if (!seat) return null;

  const [table] = await db.select({ currentHandId: pokerTables.currentHandId })
    .from(pokerTables)
    .where(eq(pokerTables.id, tableId))
    .limit(1);
  if (!table?.currentHandId) return null;

  const [result] = await db.select({ holeCards: pokerGameResults.holeCards })
    .from(pokerGameResults)
    .where(and(
      eq(pokerGameResults.handId, table.currentHandId),
      eq(pokerGameResults.seatNumber, seat.seatNumber)
    ))
    .limit(1);

  return result?.holeCards ?? null;
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

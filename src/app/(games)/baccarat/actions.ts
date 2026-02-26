'use server';

import { baccaratDb as db } from '@/lib/db';
import { baccaratTables, baccaratBets, baccaratRounds, users, pointTransactions } from '@/lib/db/schema';
import { getSession } from '@/lib/auth/session';
import { eq, and, sql } from 'drizzle-orm';
import { broadcastBaccaratState } from '@/lib/baccarat/broadcast';
import { randomUUID } from 'crypto';

const PHASE_BETTING_MS = 15000;
const PHASE_DEALING_MS = 5000;
const PHASE_RESULT_MS = 6000;
const BET_ACTION_RETRY_LIMIT = 3;
const MAX_BET_RETRY_MS = 700;
const BET_RETRY_DELAYS = [100, 200, 400] as const;

function sleep(ms: number): Promise<void> { return new Promise(r => setTimeout(r, ms)); }

function getCardScore(value: string) {
    if (['10', 'J', 'Q', 'K'].includes(value)) return 0;
    if (value === 'A') return 1;
    return parseInt(value);
}

function drawCard() {
    const suits = ['S', 'H', 'C', 'D'];
    const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    const suit = suits[Math.floor(Math.random() * suits.length)];
    const value = values[Math.floor(Math.random() * values.length)];
    return { suit, value, score: getCardScore(value) };
}

function calculateScore(cards: any[]) {
    return cards.reduce((sum, card) => sum + card.score, 0) % 10;
}

function generateBaccaratHand() {
    const player = [drawCard(), drawCard()];
    const banker = [drawCard(), drawCard()];

    let pScore = calculateScore(player);
    let bScore = calculateScore(banker);

    if (pScore >= 8 || bScore >= 8) {
        return { player, banker, pScore, bScore };
    }

    let pThirdCard = null;
    if (pScore <= 5) {
        pThirdCard = drawCard();
        player.push(pThirdCard);
        pScore = calculateScore(player);
    }

    let bDraws = false;
    if (!pThirdCard) {
        if (bScore <= 5) bDraws = true;
    } else {
        const d = pThirdCard.score;
        if (bScore <= 2) bDraws = true;
        else if (bScore === 3 && d !== 8) bDraws = true;
        else if (bScore === 4 && d >= 2 && d <= 7) bDraws = true;
        else if (bScore === 5 && d >= 4 && d <= 7) bDraws = true;
        else if (bScore === 6 && (d === 6 || d === 7)) bDraws = true;
    }

    if (bDraws) {
        banker.push(drawCard());
        bScore = calculateScore(banker);
    }

    return { player, banker, pScore, bScore };
}

function calculateBetWinAmount(
    bet: { zone: string; amount: number },
    roundResult: 'P' | 'B' | 'T',
    isPlayerPair: boolean,
    isBankerPair: boolean
) {
    if (roundResult === 'T' && (bet.zone === 'player' || bet.zone === 'banker')) {
        return bet.amount;
    }

    if (bet.zone === 'player' && roundResult === 'P') return bet.amount * 2;
    if (bet.zone === 'banker' && roundResult === 'B') return bet.amount + Math.floor(bet.amount * 0.95);
    if (bet.zone === 'tie' && roundResult === 'T') return bet.amount * 9;
    if (bet.zone === 'player_pair' && isPlayerPair) return bet.amount * 12;
    if (bet.zone === 'banker_pair' && isBankerPair) return bet.amount * 12;
    return 0;
}

async function loadUserBetsSummary(tableId: string, roundId: string, userId: string) {
    if (!db) return {};

    const rows = await db
        .select({
            zone: baccaratBets.zone,
            total: sql<number>`sum(${baccaratBets.amount})`.mapWith(Number),
        })
        .from(baccaratBets)
        .where(and(
            eq(baccaratBets.tableId, tableId),
            eq(baccaratBets.roundId, roundId),
            eq(baccaratBets.userId, userId),
            eq(baccaratBets.isResolved, false),
        ))
        .groupBy(baccaratBets.zone);

    const summary: Record<string, number> = {};
    for (const row of rows as Array<{ zone: string; total: number | null }>) {
        summary[row.zone] = row.total || 0;
    }
    return summary;
}

// Ensure the table is running and in the right phase. This is the WATCHDOG loop.
export async function syncBaccaratState(tableId: string) {
    try {
        if (!db) return null;

        let stateChanged = false;
        let requiresTransaction = false;
        let lockUnavailable = false;

        // 1. Quick read outside transaction to save connections
        let tables = await db.select().from(baccaratTables).where(eq(baccaratTables.id, tableId)).limit(1);
        let t = tables[0];
        const now = Date.now();

        if (!t) {
            requiresTransaction = true;
        } else {
            let endsAt = t.phaseEndsAt ? t.phaseEndsAt.getTime() : 0;
            if (!t.currentRoundId || endsAt === 0 || now >= endsAt) {
                requiresTransaction = true;
            }
        }

        // 2. Only enter transaction if we need to progress the game state
        if (requiresTransaction) {
            await db.transaction(async (tx: any) => {
                await tx.execute(sql`SET LOCAL statement_timeout = '5000'`);

                const lockResult = await tx.execute(
                    sql`SELECT pg_try_advisory_xact_lock(hashtext(${tableId}::text)) as locked`
                );
                const locked = Boolean((lockResult as any)?.[0]?.locked);
                if (!locked) {
                    lockUnavailable = true;
                    return;
                }

                let txTables = await tx.select().from(baccaratTables).where(eq(baccaratTables.id, tableId)).limit(1);

                if (txTables.length === 0) {
                    await tx.insert(baccaratTables).values({ id: tableId, status: 'betting', history: [] });
                    txTables = await tx.select().from(baccaratTables).where(eq(baccaratTables.id, tableId)).limit(1);
                    stateChanged = true;
                }

                let txT = txTables[0];
                let txEndsAt = txT.phaseEndsAt ? txT.phaseEndsAt.getTime() : 0;

                if (!txT.currentRoundId || txEndsAt === 0) {
                    const newRoundId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : randomUUID();
                    txT.currentRoundId = newRoundId;
                    txT.status = 'betting';
                    txT.phaseEndsAt = new Date(now + PHASE_BETTING_MS);
                    await tx.update(baccaratTables).set({
                        currentRoundId: newRoundId,
                        status: 'betting',
                        phaseEndsAt: txT.phaseEndsAt
                    }).where(eq(baccaratTables.id, tableId));
                    stateChanged = true;
                    return;
                }

                if (now < txEndsAt) return; // Another request already advanced it

                // Mathematical Catch-Up Loop
                const cycleMs = PHASE_BETTING_MS + PHASE_DEALING_MS + PHASE_RESULT_MS;
                if (now - txEndsAt > cycleMs * 50) {
                    const skipCycles = Math.floor((now - txEndsAt) / cycleMs) - 50;
                    if (skipCycles > 0) txEndsAt += skipCycles * cycleMs;
                }

                let currentStatus = txT.status;
                let currentRoundId = txT.currentRoundId;
                let newResults: string[] = [];
                let dbUpdates = 0;

                while (now >= txEndsAt && dbUpdates < 200) {
                    dbUpdates++;
                    if (currentStatus === 'betting') {
                        const hand = generateBaccaratHand();
                        const res = hand.pScore > hand.bScore ? 'P' : hand.pScore < hand.bScore ? 'B' : 'T';

                        await tx.insert(baccaratRounds).values({
                            id: currentRoundId,
                            tableId: tableId,
                            playerCards: hand.player,
                            bankerCards: hand.banker,
                            playerScore: hand.pScore,
                            bankerScore: hand.bScore,
                            result: res,
                        });

                        currentStatus = 'dealing';
                        txEndsAt += PHASE_DEALING_MS;

                    } else if (currentStatus === 'dealing') {
                        currentStatus = 'result';
                        txEndsAt += PHASE_RESULT_MS;

                    } else if (currentStatus === 'result') {
                        const rounds = await tx.select().from(baccaratRounds).where(eq(baccaratRounds.id, currentRoundId)).limit(1);
                        if (rounds.length > 0) {
                            const round = rounds[0];
                            const res = (round.result || 'T') as 'P' | 'B' | 'T';

                            const pCards: any = round.playerCards || [];
                            const bCards: any = round.bankerCards || [];
                            const isPPair = pCards.length >= 2 && pCards[0].value === pCards[1].value;
                            const isBPair = bCards.length >= 2 && bCards[0].value === bCards[1].value;

                            const bets = await tx.select().from(baccaratBets).where(and(eq(baccaratBets.roundId, currentRoundId), eq(baccaratBets.isResolved, false)));
                            const winningsByUser = new Map<string, number>();

                            for (const bet of bets) {
                                const winAmount = calculateBetWinAmount(bet, res, isPPair, isBPair);
                                if (winAmount > 0) {
                                    winningsByUser.set(bet.userId, (winningsByUser.get(bet.userId) || 0) + winAmount);
                                }
                            }

                            if (winningsByUser.size > 0) {
                                const txRows: any[] = [];
                                for (const [winnerId, totalWin] of winningsByUser.entries()) {
                                    const [updatedUser] = await tx
                                        .update(users)
                                        .set({ points: sql`points + ${totalWin}` })
                                        .where(eq(users.id, winnerId))
                                        .returning({ points: users.points });

                                    txRows.push({
                                        userId: winnerId,
                                        amount: totalWin,
                                        balanceAfter: updatedUser?.points ?? 0,
                                        type: 'earn_game',
                                        description: `Baccarat win payout: +${totalWin}P`,
                                    });
                                }

                                if (txRows.length > 0) {
                                    await tx.insert(pointTransactions).values(txRows);
                                }
                            }

                            await tx
                                .update(baccaratBets)
                                .set({ isResolved: true })
                                .where(and(
                                    eq(baccaratBets.roundId, currentRoundId),
                                    eq(baccaratBets.isResolved, false)
                                ));

                            newResults.push(res);
                        }

                        currentRoundId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : randomUUID();
                        currentStatus = 'betting';
                        txEndsAt += PHASE_BETTING_MS;
                    }
                }

                // Commit final state — use jsonb append+trim for history to avoid full column replacement
                await tx.update(baccaratTables).set({
                    status: currentStatus as "betting" | "dealing" | "result",
                    currentRoundId: currentRoundId,
                    ...(newResults.length > 0 ? {
                        history: sql`(COALESCE(${baccaratTables.history}, '[]'::jsonb) || ${JSON.stringify(newResults)}::jsonb)[(-36):]`,
                    } : {}),
                    phaseEndsAt: new Date(txEndsAt),
                }).where(eq(baccaratTables.id, tableId));
                stateChanged = true;
            });
        }

        let myBets: any = {};
        let balance = 0;
        const session = await getSession().catch(() => null);
        if (session?.userId) {
            const [usr] = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
            if (usr) balance = usr.points;
        }

        if (requiresTransaction) {
            // Fetch the updated latest state after transaction commits.
            const latestTables = await db.select().from(baccaratTables).where(eq(baccaratTables.id, tableId)).limit(1);
            if (latestTables.length === 0) return null;
            t = latestTables[0];
        }

        if (!t) return null;

        // Fetch round data if any
        let roundData = null;
        if (t.status !== 'betting') {
            const rounds = await db.select().from(baccaratRounds).where(eq(baccaratRounds.id, t.currentRoundId || '')).limit(1);
            roundData = rounds[0] || null;
        }

        // Fetch active bets for visual update (if betting phase)
        if (session?.userId && t.status === 'betting' && t.currentRoundId) {
            myBets = await loadUserBetsSummary(tableId, t.currentRoundId || '', session.userId);
        }

        const payload = {
            table: t,
            round: roundData,
            serverTime: Date.now(),
        };

        if (stateChanged) {
            // Non-blocking so sync responses are not delayed by realtime handshake/retry.
            void broadcastBaccaratState(tableId, payload);
        } else if (lockUnavailable) {
            // Another request is already advancing this table.
            // Returning latest read state keeps request cheap under boundary bursts.
        }
        return { ...payload, myBets, balance };

    } catch (error: any) {
        console.error('syncBaccaratState exception:', error);
        return { error: error.message || 'Unknown server error', stack: error.stack };
    }
}

export async function placeBaccaratBet(tableId: string, zone: any, amount: number) {
    if (!db) return { success: false, error: 'DB unavailable' };
    const session = await getSession();
    if (!session?.userId) return { success: false, error: 'Not logged in' };
    const userId = session.userId;

    async function runPlaceBet() {
        return await db.transaction(async (tx: any) => {
            await tx.execute(sql`SELECT 1 FROM baccarat_tables WHERE id = ${tableId} FOR UPDATE`);

            const tables = await tx.select().from(baccaratTables).where(eq(baccaratTables.id, tableId)).limit(1);
            if (tables.length === 0) return { success: false, error: 'Table not found', needsSync: true as const };
            const t = tables[0];

            const now = Date.now();
            const phaseEndsAtMs = t.phaseEndsAt ? t.phaseEndsAt.getTime() : 0;
            if (!t.currentRoundId || phaseEndsAtMs === 0 || now >= phaseEndsAtMs) {
                return { success: false, error: 'Round transitioning', needsSync: true as const };
            }

            if (t.status !== 'betting') return { success: false, error: 'Not in betting phase' as const };

            const [usr] = await tx.update(users)
                .set({ points: sql`points - ${amount}` })
                .where(and(eq(users.id, userId), sql`points >= ${amount}`))
                .returning({ points: users.points });

            if (!usr) return { success: false, error: 'Insufficient points' as const };

            const existing = await tx
                .update(baccaratBets)
                .set({ amount: sql`${baccaratBets.amount} + ${amount}` })
                .where(and(
                    eq(baccaratBets.tableId, tableId),
                    eq(baccaratBets.roundId, t.currentRoundId),
                    eq(baccaratBets.userId, userId),
                    eq(baccaratBets.zone, zone),
                    eq(baccaratBets.isResolved, false)
                ))
                .returning({ id: baccaratBets.id });

            if (existing.length === 0) {
                await tx.insert(baccaratBets).values({
                    tableId,
                    userId,
                    zone,
                    amount,
                    roundId: t.currentRoundId,
                });
            }

            return { success: true, balance: usr.points as number };
        });
    }

    const retryStart = Date.now();
    for (let attempt = 0; attempt <= BET_ACTION_RETRY_LIMIT; attempt++) {
        if (attempt > 0) {
            const elapsed = Date.now() - retryStart;
            if (elapsed >= MAX_BET_RETRY_MS) {
                console.warn('[baccarat] bet retry cap exceeded', { tableId, attempt, latencyMs: elapsed });
                break;
            }
            const baseDelay = BET_RETRY_DELAYS[Math.min(attempt - 1, BET_RETRY_DELAYS.length - 1)];
            const jitter = Math.floor(Math.random() * 50);
            console.warn('[baccarat] lock contention', { tableId, attempt, latencyMs: elapsed });
            await sleep(baseDelay + jitter);
            if (Date.now() - retryStart >= MAX_BET_RETRY_MS) break;
        }
        const result = await runPlaceBet();
        if (!(result as any).needsSync) return result;
        await syncBaccaratState(tableId);
    }

    return { success: false, error: 'Bet failed: table is transitioning' };
}

export async function clearBaccaratBets(tableId: string) {
    if (!db) return { success: false, error: 'DB unavailable' };
    const session = await getSession();
    if (!session?.userId) return { success: false, error: 'Not logged in' };
    const userId = session.userId;

    async function runClearBets() {
        return await db.transaction(async (tx: any) => {
            await tx.execute(sql`SELECT 1 FROM baccarat_tables WHERE id = ${tableId} FOR UPDATE`);

            const tables = await tx.select().from(baccaratTables).where(eq(baccaratTables.id, tableId)).limit(1);
            if (tables.length === 0) return { success: false, error: 'Table not found', needsSync: true as const };
            const t = tables[0];

            const now = Date.now();
            const phaseEndsAtMs = t.phaseEndsAt ? t.phaseEndsAt.getTime() : 0;
            if (!t.currentRoundId || phaseEndsAtMs === 0 || now >= phaseEndsAtMs) {
                return { success: false, error: 'Round transitioning', needsSync: true as const };
            }

            if (t.status !== 'betting') return { success: false, error: 'Not in betting phase' as const };

            const removed = await tx
                .delete(baccaratBets)
                .where(and(
                    eq(baccaratBets.tableId, tableId),
                    eq(baccaratBets.roundId, t.currentRoundId || ''),
                    eq(baccaratBets.userId, userId),
                    eq(baccaratBets.isResolved, false)
                ))
                .returning({ amount: baccaratBets.amount });

            const totalRefund = removed.reduce((sum: number, row: { amount: number }) => sum + row.amount, 0);
            if (totalRefund === 0) return { success: true as const };

            const [usr] = await tx.update(users)
                .set({ points: sql`points + ${totalRefund}` })
                .where(eq(users.id, userId))
                .returning({ points: users.points });

            return { success: true as const, balance: usr.points as number };
        });
    }

    const retryStart = Date.now();
    for (let attempt = 0; attempt <= BET_ACTION_RETRY_LIMIT; attempt++) {
        if (attempt > 0) {
            const elapsed = Date.now() - retryStart;
            if (elapsed >= MAX_BET_RETRY_MS) {
                console.warn('[baccarat] clear retry cap exceeded', { tableId, attempt, latencyMs: elapsed });
                break;
            }
            const baseDelay = BET_RETRY_DELAYS[Math.min(attempt - 1, BET_RETRY_DELAYS.length - 1)];
            const jitter = Math.floor(Math.random() * 50);
            console.warn('[baccarat] clear lock contention', { tableId, attempt, latencyMs: elapsed });
            await sleep(baseDelay + jitter);
            if (Date.now() - retryStart >= MAX_BET_RETRY_MS) break;
        }
        const result = await runClearBets();
        if (!(result as any).needsSync) return result;
        await syncBaccaratState(tableId);
    }

    return { success: false, error: 'Bet clear failed: table is transitioning' };
}

export async function getBaccaratState(tableId: string) {
    return await syncBaccaratState(tableId); // Triggers update if necessary and returns current state
}

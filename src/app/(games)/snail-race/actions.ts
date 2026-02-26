// Run this SQL in Supabase SQL Editor:
// ALTER TABLE snail_race_rounds ADD COLUMN IF NOT EXISTS participants jsonb DEFAULT '[]';

'use server';

import { baccaratDb as db } from '@/lib/db';
import { snailRaceTables, snailRaceRounds, snailRaceBets, users, pointTransactions } from '@/lib/db/schema';
import { getSession } from '@/lib/auth/session';
import { eq, and, sql } from 'drizzle-orm';
import { broadcastSnailRaceState } from '@/lib/snail-race/broadcast';
import { randomUUID } from 'crypto';

const PHASE_BETTING_MS = 30000;
const PHASE_RACING_MS = 15000;
const PHASE_RESULT_MS = 10000;
const BET_ACTION_RETRY_LIMIT = 3;
const MAX_BET_RETRY_MS = 700;
const BET_RETRY_DELAYS = [100, 200, 400] as const;
const ROOM_IDLE_EXPIRY_MS = 60 * 60 * 1000;
const MAX_CATCHUP_ITERATIONS = 10;

export const SNAILS = [
    { id: 0, name: '지나', color: '#ef4444' },
    { id: 1, name: '해연', color: '#3b82f6' },
    { id: 2, name: '영', color: '#22c55e' },
    { id: 3, name: '뻥카', color: '#f59e0b' },
    { id: 4, name: '우성', color: '#a855f7' },
    { id: 5, name: '테리', color: '#ec4899' },
    { id: 6, name: '경원', color: '#06b6d4' },
] as const;

function sleep(ms: number): Promise<void> { return new Promise(r => setTimeout(r, ms)); }

function newId(): string {
    return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : randomUUID();
}

function fisherYates(arr: number[]): number[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function selectParticipants(): number[] {
    const all = [0, 1, 2, 3, 4, 5, 6];
    return fisherYates(all).slice(0, 3);
}

function generateRaceResult(participants: number[]): { raceSeed: string; finishOrder: number[]; participants: number[] } {
    const raceSeed = newId();
    const finishOrder = fisherYates(participants);
    return { raceSeed, finishOrder, participants };
}

export async function getSnailOdds(tableId: string): Promise<Record<number, number>> {
    if (!db) return {};

    const rounds = await db
        .select({ finishOrder: snailRaceRounds.finishOrder, participants: snailRaceRounds.participants })
        .from(snailRaceRounds)
        .where(eq(snailRaceRounds.tableId, tableId))
        .orderBy(sql`${snailRaceRounds.createdAt} DESC`)
        .limit(30);

    const appearances: Record<number, number> = {};
    const wins: Record<number, number> = {};

    for (const round of rounds) {
        const participants = round.participants as number[] | null;
        const finishOrder = round.finishOrder as number[] | null;
        if (!participants || !finishOrder) continue;

        for (const snailId of participants) {
            appearances[snailId] = (appearances[snailId] ?? 0) + 1;
        }
        const winner = finishOrder[0];
        if (winner !== undefined) {
            wins[winner] = (wins[winner] ?? 0) + 1;
        }
    }

    const odds: Record<number, number> = {};
    for (let i = 0; i < 7; i++) {
        const app = appearances[i] ?? 0;
        const w = wins[i] ?? 0;
        if (app < 5) {
            odds[i] = 3.0;
        } else {
            const winRate = w / app;
            const rawOdds = 1 / winRate;
            const edgeOdds = rawOdds * 0.9;
            odds[i] = Math.max(1.5, Math.min(5.0, edgeOdds));
        }
    }
    return odds;
}

function calculateSnailBetPayout(
    bet: { snails: number[]; amount: number; odds: number },
    finishOrder: number[]
): number {
    const won = bet.snails[0] === finishOrder[0];
    if (!won) return 0;
    return Math.floor(bet.amount * bet.odds);
}

export async function syncSnailRaceState(tableId: string) {
    try {
        if (!db) return null;

        let stateChanged = false;
        let requiresTransaction = false;
        let lockUnavailable = false;

        // 1. Quick read outside transaction
        let tables = await db.select().from(snailRaceTables).where(eq(snailRaceTables.id, tableId)).limit(1);
        let t = tables[0];
        const now = Date.now();

        if (!t) {
            requiresTransaction = true;
        } else {
            const endsAt = t.phaseEndsAt ? t.phaseEndsAt.getTime() : 0;
            if (!t.currentRoundId || endsAt === 0 || now >= endsAt) {
                requiresTransaction = true;
            }
        }

        // 2. Only enter transaction if we need to advance state
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

                let txTables = await tx.select().from(snailRaceTables).where(eq(snailRaceTables.id, tableId)).limit(1);

                if (txTables.length === 0) {
                    await tx.insert(snailRaceTables).values({ id: tableId, status: 'betting', history: [] });
                    txTables = await tx.select().from(snailRaceTables).where(eq(snailRaceTables.id, tableId)).limit(1);
                    stateChanged = true;
                }

                let txT = txTables[0];
                let txEndsAt = txT.phaseEndsAt ? txT.phaseEndsAt.getTime() : 0;

                if (!txT.currentRoundId || txEndsAt === 0) {
                    const newRoundId = newId();
                    await tx.update(snailRaceTables).set({
                        currentRoundId: newRoundId,
                        status: 'betting',
                        phaseEndsAt: new Date(now + PHASE_BETTING_MS),
                    }).where(eq(snailRaceTables.id, tableId));
                    stateChanged = true;
                    return;
                }

                if (now < txEndsAt) return;

                // Idle room reset after 1 hour
                if (now - txEndsAt > ROOM_IDLE_EXPIRY_MS) {
                    const freshRoundId = newId();
                    const staleBets = await tx.select().from(snailRaceBets).where(and(eq(snailRaceBets.tableId, tableId), eq(snailRaceBets.isResolved, false)));
                    const refundByUser = new Map<string, number>();
                    for (const bet of staleBets) {
                        refundByUser.set(bet.userId, (refundByUser.get(bet.userId) || 0) + bet.amount);
                    }
                    for (const [uid, refund] of refundByUser.entries()) {
                        await tx.update(users).set({ points: sql`points + ${refund}` }).where(eq(users.id, uid));
                    }
                    if (staleBets.length > 0) {
                        await tx.update(snailRaceBets).set({ isResolved: true }).where(and(eq(snailRaceBets.tableId, tableId), eq(snailRaceBets.isResolved, false)));
                    }
                    await tx.update(snailRaceTables).set({
                        status: 'betting',
                        currentRoundId: freshRoundId,
                        phaseEndsAt: new Date(now + PHASE_BETTING_MS),
                        history: sql`'[]'::jsonb`,
                    }).where(eq(snailRaceTables.id, tableId));
                    stateChanged = true;
                    return;
                }

                // Catch-up loop (capped)
                const cycleMs = PHASE_BETTING_MS + PHASE_RACING_MS + PHASE_RESULT_MS;
                if (now - txEndsAt > cycleMs * 50) {
                    const skipCycles = Math.floor((now - txEndsAt) / cycleMs) - 50;
                    if (skipCycles > 0) txEndsAt += skipCycles * cycleMs;
                }

                let currentStatus = txT.status as string;
                let currentRoundId = txT.currentRoundId as string;
                const newResults: number[][] = [];
                let dbUpdates = 0;

                while (now >= txEndsAt && dbUpdates < MAX_CATCHUP_ITERATIONS) {
                    dbUpdates++;

                    if (currentStatus === 'betting') {
                        // betting -> racing: select participants, generate race result, insert round
                        const participants = selectParticipants();
                        const { raceSeed, finishOrder } = generateRaceResult(participants);
                        await tx.insert(snailRaceRounds).values({
                            id: currentRoundId,
                            tableId,
                            raceSeed,
                            finishOrder,
                            participants,
                        });
                        currentStatus = 'racing';
                        txEndsAt += PHASE_RACING_MS;

                    } else if (currentStatus === 'racing') {
                        currentStatus = 'result';
                        txEndsAt += PHASE_RESULT_MS;

                    } else if (currentStatus === 'result') {
                        // result -> betting: resolve bets, pay out
                        const rounds = await tx.select().from(snailRaceRounds).where(eq(snailRaceRounds.id, currentRoundId)).limit(1);
                        if (rounds.length > 0) {
                            const round = rounds[0];
                            const finishOrder = round.finishOrder as number[];

                            const bets = await tx.select().from(snailRaceBets).where(and(
                                eq(snailRaceBets.roundId, currentRoundId),
                                eq(snailRaceBets.isResolved, false)
                            ));

                            // Get current odds at payout time
                            const oddsSnapshot = await getSnailOdds(tableId);

                            const winningsByUser = new Map<string, number>();
                            for (const bet of bets) {
                                const snailId = (bet.snails as number[])[0];
                                const betOdds = oddsSnapshot[snailId] ?? 3.0;
                                const payout = calculateSnailBetPayout({
                                    snails: bet.snails as number[],
                                    amount: bet.amount,
                                    odds: betOdds,
                                }, finishOrder);
                                if (payout > 0) {
                                    winningsByUser.set(bet.userId, (winningsByUser.get(bet.userId) || 0) + payout);
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
                                        description: `Snail race win payout: +${totalWin}P`,
                                    });
                                }
                                if (txRows.length > 0) {
                                    await tx.insert(pointTransactions).values(txRows);
                                }
                            }

                            await tx.update(snailRaceBets).set({ isResolved: true }).where(and(
                                eq(snailRaceBets.roundId, currentRoundId),
                                eq(snailRaceBets.isResolved, false)
                            ));

                            newResults.push(finishOrder);
                        }

                        currentRoundId = newId();
                        currentStatus = 'betting';
                        txEndsAt += PHASE_BETTING_MS;
                    }
                }

                // App-level history slicing instead of Postgres JSONB slice
                const existingHistory = (txT.history as number[][] || []);
                const combined = [...existingHistory, ...newResults].slice(-36);

                await tx.update(snailRaceTables).set({
                    status: currentStatus as 'betting' | 'racing' | 'result',
                    currentRoundId,
                    ...(newResults.length > 0 ? {
                        history: JSON.stringify(combined),
                    } : {}),
                    phaseEndsAt: new Date(txEndsAt),
                    updatedAt: new Date(),
                }).where(eq(snailRaceTables.id, tableId));
                stateChanged = true;
            });
        }

        let myBets: any[] = [];
        let balance = 0;
        const session = await getSession().catch(() => null);
        if (session?.userId) {
            const [usr] = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
            if (usr) balance = usr.points;
        }

        if (requiresTransaction) {
            const latestTables = await db.select().from(snailRaceTables).where(eq(snailRaceTables.id, tableId)).limit(1);
            if (latestTables.length === 0) return null;
            t = latestTables[0];
        }

        if (!t) return null;

        let roundData = null;
        if (t.status !== 'betting' && t.currentRoundId) {
            const rounds = await db.select().from(snailRaceRounds).where(eq(snailRaceRounds.id, t.currentRoundId)).limit(1);
            roundData = rounds[0] || null;
        }

        // Get participants for current round
        let currentParticipants: number[] = [];
        if (t.currentRoundId) {
            const roundRows = await db.select({ participants: snailRaceRounds.participants }).from(snailRaceRounds).where(eq(snailRaceRounds.id, t.currentRoundId)).limit(1);
            if (roundRows[0]) {
                currentParticipants = (roundRows[0].participants as number[]) || [];
            }
        }

        const odds = await getSnailOdds(tableId);

        if (session?.userId && t.currentRoundId) {
            myBets = await db.select().from(snailRaceBets).where(and(
                eq(snailRaceBets.tableId, tableId),
                eq(snailRaceBets.roundId, t.currentRoundId),
                eq(snailRaceBets.userId, session.userId),
                eq(snailRaceBets.isResolved, false),
            ));
        }

        const payload = {
            table: t,
            round: roundData,
            serverTime: Date.now(),
            participants: currentParticipants,
            odds,
        };

        if (stateChanged) {
            void broadcastSnailRaceState(tableId, payload);
        }

        return { ...payload, myBets, balance };

    } catch (error: any) {
        console.error('syncSnailRaceState exception:', error);
        return { error: error.message || 'Unknown server error', stack: error.stack };
    }
}

export async function placeSnailRaceBet(tableId: string, snailId: number, amount: number) {
    if (!db) return { success: false, error: 'DB unavailable' };
    const session = await getSession();
    if (!session?.userId) return { success: false, error: 'Not logged in' };
    const userId = session.userId;

    if (!Number.isInteger(snailId) || snailId < 0 || snailId > 6) {
        return { success: false, error: 'Invalid snail id' };
    }
    if (amount <= 0 || !Number.isInteger(amount)) return { success: false, error: 'Invalid amount' };

    async function runPlaceBet() {
        return await db.transaction(async (tx: any) => {
            await tx.execute(sql`SET LOCAL statement_timeout = '5000'`);
            await tx.execute(sql`SELECT 1 FROM snail_race_tables WHERE id = ${tableId} FOR UPDATE`);

            const tables = await tx.select().from(snailRaceTables).where(eq(snailRaceTables.id, tableId)).limit(1);
            if (tables.length === 0) return { success: false, error: 'Table not found', needsSync: true as const };
            const t = tables[0];

            const now = Date.now();
            const phaseEndsAtMs = t.phaseEndsAt ? t.phaseEndsAt.getTime() : 0;
            if (!t.currentRoundId || phaseEndsAtMs === 0 || now >= phaseEndsAtMs) {
                return { success: false, error: 'Round transitioning', needsSync: true as const };
            }

            if (t.status !== 'betting') return { success: false, error: 'Not in betting phase' as const };

            // Validate snailId is in current round's participants
            const roundRows = await tx.select({ participants: snailRaceRounds.participants }).from(snailRaceRounds).where(eq(snailRaceRounds.id, t.currentRoundId)).limit(1);
            const participants: number[] = roundRows[0] ? ((roundRows[0].participants as number[]) || []) : [];
            if (participants.length > 0 && !participants.includes(snailId)) {
                return { success: false, error: 'Snail not participating in this round' as const };
            }

            // One bet per round per user: if existing bet, refund old one first
            const existingBets = await tx.select().from(snailRaceBets).where(and(
                eq(snailRaceBets.tableId, tableId),
                eq(snailRaceBets.roundId, t.currentRoundId),
                eq(snailRaceBets.userId, userId),
                eq(snailRaceBets.isResolved, false),
            ));

            if (existingBets.length > 0) {
                const totalRefund = existingBets.reduce((sum: number, b: { amount: number }) => sum + b.amount, 0);
                await tx.delete(snailRaceBets).where(and(
                    eq(snailRaceBets.tableId, tableId),
                    eq(snailRaceBets.roundId, t.currentRoundId),
                    eq(snailRaceBets.userId, userId),
                    eq(snailRaceBets.isResolved, false),
                ));
                await tx.update(users).set({ points: sql`points + ${totalRefund}` }).where(eq(users.id, userId));
            }

            const [usr] = await tx.update(users)
                .set({ points: sql`points - ${amount}` })
                .where(and(eq(users.id, userId), sql`points >= ${amount}`))
                .returning({ points: users.points });

            if (!usr) return { success: false, error: 'Insufficient points' as const };

            await tx.insert(snailRaceBets).values({
                tableId,
                userId,
                betType: 'win' as const,
                snails: [snailId],
                amount,
                roundId: t.currentRoundId,
            });

            return { success: true, balance: usr.points as number };
        });
    }

    const retryStart = Date.now();
    for (let attempt = 0; attempt <= BET_ACTION_RETRY_LIMIT; attempt++) {
        if (attempt > 0) {
            const elapsed = Date.now() - retryStart;
            if (elapsed >= MAX_BET_RETRY_MS) {
                console.warn('[snail-race] bet retry cap exceeded', { tableId, attempt, latencyMs: elapsed });
                break;
            }
            const baseDelay = BET_RETRY_DELAYS[Math.min(attempt - 1, BET_RETRY_DELAYS.length - 1)];
            const jitter = Math.floor(Math.random() * 50);
            console.warn('[snail-race] lock contention', { tableId, attempt, latencyMs: elapsed });
            await sleep(baseDelay + jitter);
            if (Date.now() - retryStart >= MAX_BET_RETRY_MS) break;
        }
        const result = await runPlaceBet();
        if (!(result as any).needsSync) return result;
        await syncSnailRaceState(tableId);
    }

    return { success: false, error: 'Bet failed: table is transitioning' };
}

export async function clearSnailRaceBets(tableId: string) {
    if (!db) return { success: false, error: 'DB unavailable' };
    const session = await getSession();
    if (!session?.userId) return { success: false, error: 'Not logged in' };
    const userId = session.userId;

    async function runClearBets() {
        return await db.transaction(async (tx: any) => {
            await tx.execute(sql`SET LOCAL statement_timeout = '5000'`);
            await tx.execute(sql`SELECT 1 FROM snail_race_tables WHERE id = ${tableId} FOR UPDATE`);

            const tables = await tx.select().from(snailRaceTables).where(eq(snailRaceTables.id, tableId)).limit(1);
            if (tables.length === 0) return { success: false, error: 'Table not found', needsSync: true as const };
            const t = tables[0];

            const now = Date.now();
            const phaseEndsAtMs = t.phaseEndsAt ? t.phaseEndsAt.getTime() : 0;
            if (!t.currentRoundId || phaseEndsAtMs === 0 || now >= phaseEndsAtMs) {
                return { success: false, error: 'Round transitioning', needsSync: true as const };
            }

            if (t.status !== 'betting') return { success: false, error: 'Not in betting phase' as const };

            const removed = await tx
                .delete(snailRaceBets)
                .where(and(
                    eq(snailRaceBets.tableId, tableId),
                    eq(snailRaceBets.roundId, t.currentRoundId || ''),
                    eq(snailRaceBets.userId, userId),
                    eq(snailRaceBets.isResolved, false)
                ))
                .returning({ amount: snailRaceBets.amount });

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
                console.warn('[snail-race] clear retry cap exceeded', { tableId, attempt, latencyMs: elapsed });
                break;
            }
            const baseDelay = BET_RETRY_DELAYS[Math.min(attempt - 1, BET_RETRY_DELAYS.length - 1)];
            const jitter = Math.floor(Math.random() * 50);
            console.warn('[snail-race] clear lock contention', { tableId, attempt, latencyMs: elapsed });
            await sleep(baseDelay + jitter);
            if (Date.now() - retryStart >= MAX_BET_RETRY_MS) break;
        }
        const result = await runClearBets();
        if (!(result as any).needsSync) return result;
        await syncSnailRaceState(tableId);
    }

    return { success: false, error: 'Bet clear failed: table is transitioning' };
}

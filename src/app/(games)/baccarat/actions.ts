'use server';

import { db } from '@/lib/db';
import { baccaratTables, baccaratBets, baccaratRounds, users, pointTransactions } from '@/lib/db/schema';
import { getSession } from '@/lib/auth/session';
import { eq, and, sql } from 'drizzle-orm';
import { broadcastBaccaratState } from '@/lib/baccarat/broadcast';
import { randomUUID } from 'crypto';

const PHASE_BETTING_MS = 15000;
const PHASE_DEALING_MS = 5000;
const PHASE_RESULT_MS = 6000;

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

// Ensure the table is running and in the right phase. This is the WATCHDOG loop.
export async function syncBaccaratState(tableId: string) {
    if (!db) return null;

    let payloadToBroadcast: any = null;
    let myBetsData: any = {};

    await db.transaction(async (tx: any) => {
        await tx.execute(sql`SELECT 1 FROM baccarat_tables WHERE id = ${tableId} FOR UPDATE`);
        let tables = await tx.select().from(baccaratTables).where(eq(baccaratTables.id, tableId)).limit(1);

        if (tables.length === 0) {
            await tx.insert(baccaratTables).values({ id: tableId, status: 'betting', history: [] });
            tables = await tx.select().from(baccaratTables).where(eq(baccaratTables.id, tableId)).limit(1);
        }

        let t = tables[0];
        const now = Date.now();
        let endsAt = t.phaseEndsAt ? t.phaseEndsAt.getTime() : 0;

        if (!t.currentRoundId || endsAt === 0) {
            const newRoundId = randomUUID();
            t.currentRoundId = newRoundId;
            t.status = 'betting';
            t.phaseEndsAt = new Date(now + PHASE_BETTING_MS);
            await tx.update(baccaratTables).set({
                currentRoundId: newRoundId,
                status: 'betting',
                phaseEndsAt: t.phaseEndsAt
            }).where(eq(baccaratTables.id, tableId));

            payloadToBroadcast = { table: t, round: null, serverTime: now };
            return;
        }

        if (now < endsAt) return; // DB is up to date

        // Mathematical Catch-Up Loop
        const cycleMs = PHASE_BETTING_MS + PHASE_DEALING_MS + PHASE_RESULT_MS;
        if (now - endsAt > cycleMs * 50) {
            const skipCycles = Math.floor((now - endsAt) / cycleMs) - 50;
            if (skipCycles > 0) endsAt += skipCycles * cycleMs;
        }

        let currentStatus = t.status;
        let currentRoundId = t.currentRoundId;
        let history = Array.isArray(t.history) ? [...t.history] : [];
        let dbUpdates = 0;

        while (now >= endsAt && dbUpdates < 200) {
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
                endsAt += PHASE_DEALING_MS;

            } else if (currentStatus === 'dealing') {
                currentStatus = 'result';
                endsAt += PHASE_RESULT_MS;

            } else if (currentStatus === 'result') {
                const rounds = await tx.select().from(baccaratRounds).where(eq(baccaratRounds.id, currentRoundId)).limit(1);
                if (rounds.length > 0) {
                    const round = rounds[0];
                    const res = round.result || 'T';

                    const pCards: any = round.playerCards || [];
                    const bCards: any = round.bankerCards || [];
                    const isPPair = pCards.length >= 2 && pCards[0].value === pCards[1].value;
                    const isBPair = bCards.length >= 2 && bCards[0].value === bCards[1].value;

                    const bets = await tx.select().from(baccaratBets).where(and(eq(baccaratBets.roundId, currentRoundId), eq(baccaratBets.isResolved, false)));

                    for (const bet of bets) {
                        let winAmount = 0;
                        if (bet.zone === 'player' && res === 'P') winAmount = bet.amount * 2;
                        else if (bet.zone === 'banker' && res === 'B') winAmount = bet.amount + Math.floor(bet.amount * 0.95);
                        else if (bet.zone === 'tie' && res === 'T') winAmount = bet.amount * 9;
                        else if (bet.zone === 'player_pair' && isPPair) winAmount = bet.amount * 12;
                        else if (bet.zone === 'banker_pair' && isBPair) winAmount = bet.amount * 12;

                        if (res === 'T' && (bet.zone === 'player' || bet.zone === 'banker')) winAmount = bet.amount;

                        if (winAmount > 0) {
                            await tx.update(users).set({ points: sql`points + ${winAmount}` }).where(eq(users.id, bet.userId));
                            await tx.insert(pointTransactions).values({
                                userId: bet.userId,
                                amount: winAmount,
                                balanceAfter: 0,
                                type: 'earn_game',
                                description: `Baccarat win (${bet.zone}): +${winAmount}P`,
                            });
                        }
                        await tx.update(baccaratBets).set({ isResolved: true }).where(eq(baccaratBets.id, bet.id));
                    }

                    history.push(res);
                    if (history.length > 72) history.shift();
                }

                currentRoundId = randomUUID();
                currentStatus = 'betting';
                endsAt += PHASE_BETTING_MS;
            }
        }

        // Commit final state
        t.status = currentStatus;
        t.currentRoundId = currentRoundId;
        t.history = history;
        t.phaseEndsAt = new Date(endsAt);

        await tx.update(baccaratTables).set({
            status: t.status as "betting" | "dealing" | "result",
            currentRoundId: t.currentRoundId,
            history: t.history,
            phaseEndsAt: t.phaseEndsAt,
        }).where(eq(baccaratTables.id, tableId));
    });

    if (payloadToBroadcast) {
        await broadcastBaccaratState(tableId, payloadToBroadcast);
        return { ...payloadToBroadcast, myBets: {} };
    }

    // Fetch the updated latest state (after tx commits)
    const latestTables = await db.select().from(baccaratTables).where(eq(baccaratTables.id, tableId)).limit(1);
    if (latestTables.length === 0) return null;
    const t = latestTables[0];

    // Fetch round data if any
    let roundData = null;
    if (t.status !== 'betting') {
        const rounds = await db.select().from(baccaratRounds).where(eq(baccaratRounds.id, t.currentRoundId || '')).limit(1);
        roundData = rounds[0] || null;
    }

    // Fetch active bets for visual update (if betting phase)
    let myBets: any = {};
    let balance = 0;
    const session = await getSession();
    if (session?.userId) {
        const [usr] = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
        if (usr) balance = usr.points;

        if (t.status === 'betting' && t.currentRoundId) {
            const bets = await db.select().from(baccaratBets).where(and(eq(baccaratBets.roundId, t.currentRoundId), eq(baccaratBets.userId, session.userId)));
            bets.forEach((b: any) => {
                myBets[b.zone] = (myBets[b.zone] || 0) + b.amount;
            });
        }
    }

    const payload = {
        table: t,
        round: roundData,
        serverTime: Date.now(),
    };

    // We can broadcast to everyone
    await broadcastBaccaratState(tableId, payload);
    return { ...payload, myBets, balance };
}

export async function placeBaccaratBet(tableId: string, zone: any, amount: number) {
    if (!db) return { success: false, error: 'DB unavailable' };
    const session = await getSession();
    if (!session?.userId) throw new Error('Not logged in');

    // Make sure we're up to date first
    await syncBaccaratState(tableId);

    return await db.transaction(async (tx: any) => {
        const tables = await tx.select().from(baccaratTables).where(eq(baccaratTables.id, tableId)).limit(1);
        if (tables.length === 0) throw new Error('Table not found');
        const t = tables[0];

        if (t.status !== 'betting') throw new Error('Not in betting phase');
        if (!t.currentRoundId) throw new Error('No active round');

        const [usr] = await tx.update(users)
            .set({ points: sql`points - ${amount}` })
            .where(and(eq(users.id, session.userId), sql`points >= ${amount}`))
            .returning({ points: users.points });

        if (!usr) throw new Error('Insufficient points');

        await tx.insert(baccaratBets).values({
            tableId,
            userId: session.userId,
            zone,
            amount,
            roundId: t.currentRoundId,
        });

        return { success: true, balance: usr.points };
    });
}

export async function clearBaccaratBets(tableId: string) {
    if (!db) return { success: false, error: 'DB unavailable' };
    const session = await getSession();
    if (!session?.userId) throw new Error('Not logged in');

    await syncBaccaratState(tableId);

    return await db.transaction(async (tx: any) => {
        const tables = await tx.select().from(baccaratTables).where(eq(baccaratTables.id, tableId)).limit(1);
        if (tables.length === 0) throw new Error('Table not found');
        const t = tables[0];
        if (t.status !== 'betting') throw new Error('Not in betting phase');

        const bets = await tx.select().from(baccaratBets).where(and(
            eq(baccaratBets.roundId, t.currentRoundId || ''),
            eq(baccaratBets.userId, session.userId),
            eq(baccaratBets.isResolved, false)
        ));

        const totalRefund = bets.reduce((sum: number, b: any) => sum + b.amount, 0);

        if (totalRefund > 0) {
            await tx.delete(baccaratBets).where(and(
                eq(baccaratBets.roundId, t.currentRoundId || ''),
                eq(baccaratBets.userId, session.userId)
            ));

            const [usr] = await tx.update(users)
                .set({ points: sql`points + ${totalRefund}` })
                .where(eq(users.id, session.userId))
                .returning({ points: users.points });

            return { success: true, balance: usr.points };
        }
        return { success: true };
    });
}

export async function getBaccaratState(tableId: string) {
    return await syncBaccaratState(tableId); // Triggers update if necessary and returns current state
}

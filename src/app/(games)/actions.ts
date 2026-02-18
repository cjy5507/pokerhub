'use server';

import { randomInt } from 'crypto';
import { db } from '@/lib/db';
import {
  cooldownRewards,
  lotteryTickets,
  rouletteSpins,
  users,
  pointTransactions,
} from '@/lib/db/schema';
import { getSession } from '@/lib/auth/session';
import { eq, and, desc, sql, count, gte } from 'drizzle-orm';

const COOLDOWN_MINUTES = 300; // 5 hours
const MIN_REWARD = 10;
const MAX_REWARD = 100;
const LOTTERY_COST = 100;
const DAILY_LOTTERY_LIMIT = 5;

function getRandomReward(): number {
  return randomInt(MIN_REWARD, MAX_REWARD + 1);
}

// Lottery tier probabilities (matching frontend)
// EV = 76P per 100P cost (24% house edge)
const LOTTERY_TIERS = [
  { tier: 'first' as const, probability: 0.005, prize: 5000 },
  { tier: 'second' as const, probability: 0.03, prize: 500 },
  { tier: 'third' as const, probability: 0.08, prize: 200 },
  { tier: 'fourth' as const, probability: 0.20, prize: 100 },
  { tier: 'none' as const, probability: 0.685, prize: 0 },
];

function determineLotteryTier(): { tier: 'first' | 'second' | 'third' | 'fourth' | 'none'; prize: number } {
  const roll = randomInt(0, 1000000) / 1000000;
  let cumulative = 0;

  for (const { tier, probability, prize } of LOTTERY_TIERS) {
    cumulative += probability;
    if (roll < cumulative) {
      return { tier, prize };
    }
  }

  return { tier: 'none', prize: 0 };
}

// Roulette multipliers (weighted random)
// EV = 84P per 100P bet (16% house edge)
const ROULETTE_MULTIPLIERS = [
  { multiplier: '0x', weight: 40 },
  { multiplier: '0.5x', weight: 20 },
  { multiplier: '1x', weight: 20 },
  { multiplier: '2x', weight: 12 },
  { multiplier: '3x', weight: 5 },
  { multiplier: '5x', weight: 3 },
];

function determineRouletteMultiplier(): string {
  const totalWeight = ROULETTE_MULTIPLIERS.reduce((sum, m) => sum + m.weight, 0);
  const roll = randomInt(0, totalWeight);
  let cumulative = 0;

  for (const { multiplier, weight } of ROULETTE_MULTIPLIERS) {
    cumulative += weight;
    if (roll < cumulative) {
      return multiplier;
    }
  }

  return '0x';
}

function parseMultiplier(multiplier: string): number {
  return parseFloat(multiplier.replace('x', ''));
}

export async function getUserPoints(): Promise<{ success: boolean; points?: number; error?: string }> {
  if (!db) return { success: false, error: 'Database not available' };
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: '로그인이 필요합니다' };
    }

    const [user] = await db
      .select({ points: users.points })
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);

    if (!user) {
      return { success: false, error: '사용자를 찾을 수 없습니다' };
    }

    return { success: true, points: user.points };
  } catch (error) {
    console.error('Error getting user points:', error);
    return { success: false, error: '포인트 조회에 실패했습니다' };
  }
}

export async function claimCooldownReward() {
  if (!db) return { success: false, error: 'Database not available' };
  try {
    const session = await getSession();

    if (!session) {
      return { success: false, error: '로그인이 필요합니다' };
    }

    const userId = session.userId;
    const now = new Date();

    // Query latest cooldown claim
    const [latestClaim] = await db
      .select()
      .from(cooldownRewards)
      .where(eq(cooldownRewards.userId, userId))
      .orderBy(desc(cooldownRewards.claimedAt))
      .limit(1);

    // Check cooldown
    if (latestClaim) {
      const timeSinceLastClaim = now.getTime() - latestClaim.claimedAt.getTime();
      const cooldownMs = COOLDOWN_MINUTES * 60 * 1000;

      if (timeSinceLastClaim < cooldownMs) {
        const nextClaimAt = new Date(latestClaim.claimedAt.getTime() + cooldownMs);
        return {
          success: false,
          error: '아직 수확할 수 없습니다',
          nextClaimAt: nextClaimAt.toISOString(),
        };
      }
    }

    // Generate random reward
    const pointsEarned = getRandomReward();
    const nextClaimAt = new Date(now.getTime() + COOLDOWN_MINUTES * 60 * 1000);

    // Execute in transaction
    await db.transaction(async (tx: any) => {
      // Insert cooldown reward record
      await tx.insert(cooldownRewards).values({
        userId,
        type: 'point_harvest',
        pointsEarned,
        claimedAt: now,
      });

      // Update user points
      const [updatedUser] = await tx
        .update(users)
        .set({ points: sql`${users.points} + ${pointsEarned}` })
        .where(eq(users.id, userId))
        .returning({ points: users.points });

      // Log point transaction
      await tx.insert(pointTransactions).values({
        userId,
        amount: pointsEarned,
        balanceAfter: updatedUser.points,
        type: 'earn_harvest',
        description: '쿨다운 보상',
      });
    });

    return {
      success: true,
      pointsEarned,
      nextClaimAt: nextClaimAt.toISOString(),
    };
  } catch (error) {
    console.error('Error claiming cooldown reward:', error);
    return { success: false, error: '포인트 수확에 실패했습니다' };
  }
}

export async function buyLotteryTicket() {
  if (!db) return { success: false, error: 'Database not available' };
  try {
    const session = await getSession();

    if (!session) {
      return { success: false, error: '로그인이 필요합니다' };
    }

    const userId = session.userId;

    // Get user points
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    if (!user) {
      return { success: false, error: '사용자를 찾을 수 없습니다' };
    }

    if (user.points < LOTTERY_COST) {
      return { success: false, error: '포인트가 부족합니다' };
    }

    // Check daily limit (tickets purchased today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [{ todayCount }] = await db
      .select({ todayCount: count() })
      .from(lotteryTickets)
      .where(and(eq(lotteryTickets.userId, userId), gte(lotteryTickets.createdAt, today)));

    if (todayCount >= DAILY_LOTTERY_LIMIT) {
      return { success: false, error: '오늘의 구매 한도를 초과했습니다 (5장/일)' };
    }

    // Determine ticket tier and prize
    const { tier, prize } = determineLotteryTier();

    // Execute in transaction
    const [ticket] = await db.transaction(async (tx: any) => {
      // Insert lottery ticket
      const [newTicket] = await tx
        .insert(lotteryTickets)
        .values({
          userId,
          cost: LOTTERY_COST,
          tier,
          prizeAmount: prize,
          isRevealed: false,
        })
        .returning();

      // Deduct cost from user
      const [afterSpend] = await tx
        .update(users)
        .set({ points: sql`${users.points} - ${LOTTERY_COST}` })
        .where(and(eq(users.id, userId), gte(users.points, LOTTERY_COST)))
        .returning({ points: users.points });

      if (!afterSpend) {
        throw new Error('INSUFFICIENT_POINTS');
      }

      // Log purchase transaction
      await tx.insert(pointTransactions).values({
        userId,
        amount: LOTTERY_COST,
        balanceAfter: afterSpend.points,
        type: 'spend_game',
        description: '복권 구매',
      });

      // If won, add prize
      if (prize > 0) {
        const [afterWin] = await tx
          .update(users)
          .set({ points: sql`${users.points} + ${prize}` })
          .where(eq(users.id, userId))
          .returning({ points: users.points });

        await tx.insert(pointTransactions).values({
          userId,
          amount: prize,
          balanceAfter: afterWin.points,
          type: 'earn_game',
          description: `복권 당첨 (${tier})`,
        });
      }

      return [newTicket];
    });

    return {
      success: true,
      ticket: {
        id: ticket.id,
        tier: ticket.tier,
        prizeAmount: ticket.prizeAmount,
      },
    };
  } catch (error: any) {
    if (error?.message === 'INSUFFICIENT_POINTS') {
      return { success: false, error: '포인트가 부족합니다' };
    }
    console.error('Error buying lottery ticket:', error);
    return { success: false, error: '복권 구매에 실패했습니다' };
  }
}

export async function spinRoulette(betAmount: number) {
  if (!db) return { success: false, error: 'Database not available' };
  try {
    const session = await getSession();

    if (!session) {
      return { success: false, error: '로그인이 필요합니다' };
    }

    // Validate bet amount
    const validBets = [50, 100, 200, 500];
    if (!validBets.includes(betAmount)) {
      return { success: false, error: '유효하지 않은 베팅 금액입니다' };
    }

    const userId = session.userId;

    // Get user points
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    if (!user) {
      return { success: false, error: '사용자를 찾을 수 없습니다' };
    }

    if (user.points < betAmount) {
      return { success: false, error: '포인트가 부족합니다' };
    }

    // Determine multiplier
    const multiplier = determineRouletteMultiplier();
    const multiplierValue = parseMultiplier(multiplier);
    const winAmount = betAmount * multiplierValue;

    // Execute in transaction
    await db.transaction(async (tx: any) => {
      // Insert roulette spin record
      await tx.insert(rouletteSpins).values({
        userId,
        betAmount,
        multiplier,
        winAmount,
      });

      // Deduct bet
      const [afterBet] = await tx
        .update(users)
        .set({ points: sql`${users.points} - ${betAmount}` })
        .where(and(eq(users.id, userId), gte(users.points, betAmount)))
        .returning({ points: users.points });

      if (!afterBet) {
        throw new Error('INSUFFICIENT_POINTS');
      }

      // Log bet transaction
      await tx.insert(pointTransactions).values({
        userId,
        amount: betAmount,
        balanceAfter: afterBet.points,
        type: 'spend_game',
        description: '룰렛 베팅',
      });

      // If won, add winnings
      if (winAmount > 0) {
        const [afterWin] = await tx
          .update(users)
          .set({ points: sql`${users.points} + ${winAmount}` })
          .where(eq(users.id, userId))
          .returning({ points: users.points });

        await tx.insert(pointTransactions).values({
          userId,
          amount: winAmount,
          balanceAfter: afterWin.points,
          type: 'earn_game',
          description: `룰렛 당첨 (${multiplier})`,
        });
      }
    });

    return {
      success: true,
      multiplier,
      winAmount,
    };
  } catch (error: any) {
    if (error?.message === 'INSUFFICIENT_POINTS') {
      return { success: false, error: '포인트가 부족합니다' };
    }
    console.error('Error spinning roulette:', error);
    return { success: false, error: '룰렛 실행에 실패했습니다' };
  }
}

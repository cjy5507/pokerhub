'use server';

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
  return Math.floor(Math.random() * (MAX_REWARD - MIN_REWARD + 1)) + MIN_REWARD;
}

// Lottery tier probabilities (matching frontend)
const LOTTERY_TIERS = [
  { tier: 'first' as const, probability: 0.01, prize: 10000 },
  { tier: 'second' as const, probability: 0.05, prize: 1000 },
  { tier: 'third' as const, probability: 0.15, prize: 500 },
  { tier: 'fourth' as const, probability: 0.30, prize: 200 },
  { tier: 'none' as const, probability: 0.49, prize: 0 },
];

function determineLotteryTier(): { tier: 'first' | 'second' | 'third' | 'fourth' | 'none'; prize: number } {
  const roll = Math.random();
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
const ROULETTE_MULTIPLIERS = [
  { multiplier: '0x', weight: 20 },
  { multiplier: '1x', weight: 30 },
  { multiplier: '2x', weight: 25 },
  { multiplier: '5x', weight: 15 },
  { multiplier: '10x', weight: 7 },
  { multiplier: '50x', weight: 3 },
];

function determineRouletteMultiplier(): string {
  const totalWeight = ROULETTE_MULTIPLIERS.reduce((sum, m) => sum + m.weight, 0);
  const roll = Math.random() * totalWeight;
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
      await tx
        .update(users)
        .set({ points: sql`${users.points} + ${pointsEarned}` })
        .where(eq(users.id, userId));

      // Log point transaction
      await tx.insert(pointTransactions).values({
        userId,
        amount: pointsEarned,
        type: 'earn',
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
      await tx
        .update(users)
        .set({ points: sql`${users.points} - ${LOTTERY_COST}` })
        .where(eq(users.id, userId));

      // Log purchase transaction
      await tx.insert(pointTransactions).values({
        userId,
        amount: LOTTERY_COST,
        type: 'spend',
        description: '복권 구매',
      });

      // If won, add prize
      if (prize > 0) {
        await tx
          .update(users)
          .set({ points: sql`${users.points} + ${prize}` })
          .where(eq(users.id, userId));

        await tx.insert(pointTransactions).values({
          userId,
          amount: prize,
          type: 'earn',
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
  } catch (error) {
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
      await tx
        .update(users)
        .set({ points: sql`${users.points} - ${betAmount}` })
        .where(eq(users.id, userId));

      // Log bet transaction
      await tx.insert(pointTransactions).values({
        userId,
        amount: betAmount,
        type: 'spend',
        description: '룰렛 베팅',
      });

      // If won, add winnings
      if (winAmount > 0) {
        await tx
          .update(users)
          .set({ points: sql`${users.points} + ${winAmount}` })
          .where(eq(users.id, userId));

        await tx.insert(pointTransactions).values({
          userId,
          amount: winAmount,
          type: 'earn',
          description: `룰렛 당첨 (${multiplier})`,
        });
      }
    });

    return {
      success: true,
      multiplier,
      winAmount,
    };
  } catch (error) {
    console.error('Error spinning roulette:', error);
    return { success: false, error: '룰렛 실행에 실패했습니다' };
  }
}

import { db } from '@/lib/db';
import { xpTransactions, users, levelConfigs } from '@/lib/db/schema';
import { eq, desc, sql } from 'drizzle-orm';

export type XpTransactionType =
  | 'post'
  | 'comment'
  | 'like'
  | 'hand_share'
  | 'attendance'
  | 'mission'
  | 'admin_adjust';

interface AwardXpResult {
  success: boolean;
  newXp: number;
  newLevel: number;
  leveledUp: boolean;
  transactionId: string;
}

/**
 * Award XP to a user and handle level-ups
 */
export async function awardXp(
  userId: string,
  amount: number,
  type: XpTransactionType,
  referenceId?: string
): Promise<AwardXpResult> {
  if (!db) return { success: false, newXp: 0, newLevel: 1, leveledUp: false, transactionId: '' };
  if (amount <= 0) {
    throw new Error('XP amount must be positive');
  }

  return await db.transaction(async (tx: any) => {
    // Get current user data
    const [user] = await tx
      .select({ xp: users.xp, level: users.level })
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      throw new Error('User not found');
    }

    const newXp = user.xp + amount;
    const newLevel = await calculateLevel(newXp);
    const leveledUp = newLevel > user.level;

    // Update user XP and level
    await tx
      .update(users)
      .set({
        xp: newXp,
        level: newLevel,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    // Record XP transaction
    const [transaction] = await tx
      .insert(xpTransactions)
      .values({
        userId,
        amount,
        type,
        referenceId,
      })
      .returning({ id: xpTransactions.id });

    return {
      success: true,
      newXp,
      newLevel,
      leveledUp,
      transactionId: transaction.id,
    };
  });
}

/**
 * Calculate level based on XP
 */
async function calculateLevel(xp: number): Promise<number> {
  if (!db) return 1;
  const levels = await db
    .select()
    .from(levelConfigs)
    .orderBy(desc(levelConfigs.minXp));

  for (const levelConfig of levels) {
    if (xp >= levelConfig.minXp) {
      return levelConfig.level;
    }
  }

  return 1; // Default to level 1
}

/**
 * Get XP required for next level
 */
export async function getXpForNextLevel(currentLevel: number): Promise<number | null> {
  if (!db) return null;
  const [nextLevel] = await db
    .select({ minXp: levelConfigs.minXp })
    .from(levelConfigs)
    .where(eq(levelConfigs.level, currentLevel + 1));

  return nextLevel?.minXp || null;
}

/**
 * Get user's level progress
 */
export async function getLevelProgress(userId: string) {
  if (!db) return { currentLevel: 1, currentXp: 0, currentLevelName: 'Unknown', nextLevelXp: null, progress: 0, isMaxLevel: false };
  const [user] = await db
    .select({ xp: users.xp, level: users.level })
    .from(users)
    .where(eq(users.id, userId));

  if (!user) {
    throw new Error('User not found');
  }

  const [currentLevelConfig] = await db
    .select()
    .from(levelConfigs)
    .where(eq(levelConfigs.level, user.level));

  const nextLevelXp = await getXpForNextLevel(user.level);

  if (!nextLevelXp) {
    // Max level reached
    return {
      currentLevel: user.level,
      currentXp: user.xp,
      currentLevelName: currentLevelConfig?.name || 'Unknown',
      nextLevelXp: null,
      progress: 100,
      isMaxLevel: true,
    };
  }

  const currentLevelMinXp = currentLevelConfig?.minXp || 0;
  const xpInCurrentLevel = user.xp - currentLevelMinXp;
  const xpNeededForNextLevel = nextLevelXp - currentLevelMinXp;
  const progress = Math.floor((xpInCurrentLevel / xpNeededForNextLevel) * 100);

  return {
    currentLevel: user.level,
    currentXp: user.xp,
    currentLevelName: currentLevelConfig?.name || 'Unknown',
    nextLevelXp,
    xpInCurrentLevel,
    xpNeededForNextLevel,
    progress,
    isMaxLevel: false,
  };
}

import { db } from '@/lib/db';
import { users, levelConfigs, xpTransactions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// XP curve constants
const BASE_XP = 100;
const XP_MULTIPLIER = 1.15;

/**
 * Calculate the minimum XP required for a given level
 */
export function getMinXPForLevel(level: number): number {
  if (level === 1) return 0;
  return Math.floor(BASE_XP * Math.pow(XP_MULTIPLIER, level - 1));
}

/**
 * Get the level for a given XP amount
 */
export function getLevelForXP(xp: number): number {
  let level = 1;

  // Find the highest level where minXP <= xp
  for (let i = 1; i <= 50; i++) {
    const minXP = getMinXPForLevel(i);
    if (xp >= minXP) {
      level = i;
    } else {
      break;
    }
  }

  return level;
}

/**
 * Get XP needed for next level
 */
export function getXPForNextLevel(currentXP: number): {
  currentLevel: number;
  nextLevel: number;
  currentLevelXP: number;
  nextLevelXP: number;
  progress: number;
  xpNeeded: number;
} {
  const currentLevel = getLevelForXP(currentXP);
  const nextLevel = Math.min(currentLevel + 1, 50);

  const currentLevelXP = getMinXPForLevel(currentLevel);
  const nextLevelXP = getMinXPForLevel(nextLevel);

  const xpInCurrentLevel = currentXP - currentLevelXP;
  const xpNeededForNextLevel = nextLevelXP - currentLevelXP;

  const progress = xpNeededForNextLevel > 0
    ? (xpInCurrentLevel / xpNeededForNextLevel) * 100
    : 100;

  return {
    currentLevel,
    nextLevel,
    currentLevelXP,
    nextLevelXP,
    progress: Math.min(progress, 100),
    xpNeeded: Math.max(0, nextLevelXP - currentXP),
  };
}

/**
 * Get level tier (for color coding)
 */
export function getLevelTier(level: number): {
  tier: 'beginner' | 'intermediate' | 'expert' | 'master' | 'legendary';
  color: string;
} {
  if (level >= 40) return { tier: 'legendary', color: '#c084fc' };
  if (level >= 30) return { tier: 'master', color: '#fbbf24' };
  if (level >= 20) return { tier: 'expert', color: '#60a5fa' };
  if (level >= 10) return { tier: 'intermediate', color: '#34d399' };
  return { tier: 'beginner', color: '#94a3b8' };
}

/**
 * Award XP to a user and handle level ups
 */
export async function awardXP(
  userId: string,
  amount: number,
  type: 'post' | 'comment' | 'like' | 'hand_share' | 'attendance' | 'mission' | 'admin_adjust',
  referenceId?: string
): Promise<{
  success: boolean;
  leveledUp: boolean;
  oldLevel: number;
  newLevel: number;
  totalXP: number;
}> {
  if (!db) return { success: false, leveledUp: false, oldLevel: 1, newLevel: 1, totalXP: 0 };
  try {
    // Get current user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw new Error('User not found');
    }

    const oldXP = user.xp;
    const oldLevel = user.level;
    const newXP = oldXP + amount;
    const newLevel = getLevelForXP(newXP);

    // Update user XP and level
    await db
      .update(users)
      .set({
        xp: newXP,
        level: newLevel,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    // Record XP transaction
    await db.insert(xpTransactions).values({
      userId,
      amount,
      type,
      referenceId,
    });

    return {
      success: true,
      leveledUp: newLevel > oldLevel,
      oldLevel,
      newLevel,
      totalXP: newXP,
    };
  } catch (error) {
    console.error('Error awarding XP:', error);
    throw error;
  }
}

/**
 * Get level config from database
 */
export async function getLevelConfig(level: number) {
  if (!db) return null;
  const [config] = await db
    .select()
    .from(levelConfigs)
    .where(eq(levelConfigs.level, level))
    .limit(1);

  return config;
}

/**
 * Get all level configs
 */
export async function getAllLevelConfigs() {
  if (!db) return [];
  return await db
    .select()
    .from(levelConfigs)
    .orderBy(levelConfigs.level);
}

/**
 * XP rewards for different actions
 */
export const XP_REWARDS = {
  POST_CREATE: 10,
  POST_LIKE_RECEIVED: 2,
  COMMENT_CREATE: 5,
  COMMENT_LIKE_RECEIVED: 1,
  HAND_SHARE: 15,
  ATTENDANCE_DAILY: 5,
  ATTENDANCE_STREAK_3: 10,
  ATTENDANCE_STREAK_7: 20,
  ATTENDANCE_STREAK_30: 50,
  MISSION_DAILY: 10,
  MISSION_WEEKLY: 30,
  MISSION_MONTHLY: 100,
} as const;

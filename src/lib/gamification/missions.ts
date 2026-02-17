import { db } from '@/lib/db';
import { missions, userMissions } from '@/lib/db/schema';
import { eq, and, gte, sql } from 'drizzle-orm';
import { awardPoints } from './points';
import { awardXp } from './xp';

export type MissionType = 'daily' | 'weekly' | 'monthly' | 'one_time';
export type MissionConditionType =
  | 'post_count'
  | 'comment_count'
  | 'hand_share'
  | 'attendance'
  | 'like_received';

interface Mission {
  id: string;
  type: MissionType;
  nameKo: string;
  descriptionKo: string | null;
  conditionType: MissionConditionType;
  conditionTarget: number;
  pointReward: number;
  xpReward: number;
  isActive: boolean;
}

interface UserMissionProgress {
  id: string;
  mission: Mission;
  progress: number;
  isCompleted: boolean;
  rewardClaimed: boolean;
  completedAt: Date | null;
}

/**
 * Daily mission pool - 10 options, pick 3 deterministically per user per day
 */
const DAILY_MISSION_POOL: Omit<Mission, 'id' | 'isActive'>[] = [
  {
    type: 'daily',
    nameKo: '게시글 1개 읽기',
    descriptionKo: '커뮤니티 게시글을 1개 읽어보세요',
    conditionType: 'post_count',
    conditionTarget: 1,
    pointReward: 30,
    xpReward: 5,
  },
  {
    type: 'daily',
    nameKo: '댓글 1개 작성',
    descriptionKo: '다른 사람의 게시글에 댓글을 남겨보세요',
    conditionType: 'comment_count',
    conditionTarget: 1,
    pointReward: 50,
    xpReward: 10,
  },
  {
    type: 'daily',
    nameKo: '좋아요 5개 누르기',
    descriptionKo: '마음에 드는 게시글에 좋아요를 눌러보세요',
    conditionType: 'like_received',
    conditionTarget: 5,
    pointReward: 30,
    xpReward: 5,
  },
  {
    type: 'daily',
    nameKo: '전략글 1개 읽기',
    descriptionKo: '전략 게시판의 글을 읽어보세요',
    conditionType: 'post_count',
    conditionTarget: 1,
    pointReward: 50,
    xpReward: 10,
  },
  {
    type: 'daily',
    nameKo: '게시글 3개 읽기',
    descriptionKo: '커뮤니티 게시글을 3개 읽어보세요',
    conditionType: 'post_count',
    conditionTarget: 3,
    pointReward: 50,
    xpReward: 10,
  },
  {
    type: 'daily',
    nameKo: '댓글 3개 작성',
    descriptionKo: '다양한 게시글에 댓글을 남겨보세요',
    conditionType: 'comment_count',
    conditionTarget: 3,
    pointReward: 80,
    xpReward: 15,
  },
  {
    type: 'daily',
    nameKo: '핸드 히스토리 공유',
    descriptionKo: '자신의 핸드 히스토리를 공유해보세요',
    conditionType: 'hand_share',
    conditionTarget: 1,
    pointReward: 100,
    xpReward: 20,
  },
  {
    type: 'daily',
    nameKo: '출석 체크',
    descriptionKo: '오늘도 PokerHub에 방문해주셔서 감사합니다',
    conditionType: 'attendance',
    conditionTarget: 1,
    pointReward: 50,
    xpReward: 10,
  },
  {
    type: 'daily',
    nameKo: '게시글 5개 읽기',
    descriptionKo: '커뮤니티 게시글을 5개 읽어보세요',
    conditionType: 'post_count',
    conditionTarget: 5,
    pointReward: 80,
    xpReward: 15,
  },
  {
    type: 'daily',
    nameKo: '좋아요 10개 누르기',
    descriptionKo: '다양한 게시글에 좋아요를 눌러보세요',
    conditionType: 'like_received',
    conditionTarget: 10,
    pointReward: 50,
    xpReward: 10,
  },
];

/**
 * Weekly mission pool
 */
const WEEKLY_MISSION_POOL: Omit<Mission, 'id' | 'isActive'>[] = [
  {
    type: 'weekly',
    nameKo: '게시글 10개 작성',
    descriptionKo: '이번 주에 게시글을 10개 작성해보세요',
    conditionType: 'post_count',
    conditionTarget: 10,
    pointReward: 500,
    xpReward: 100,
  },
  {
    type: 'weekly',
    nameKo: '댓글 20개 작성',
    descriptionKo: '이번 주에 댓글을 20개 작성해보세요',
    conditionType: 'comment_count',
    conditionTarget: 20,
    pointReward: 400,
    xpReward: 80,
  },
  {
    type: 'weekly',
    nameKo: '핸드 히스토리 5개 공유',
    descriptionKo: '이번 주에 핸드 히스토리를 5개 공유해보세요',
    conditionType: 'hand_share',
    conditionTarget: 5,
    pointReward: 600,
    xpReward: 120,
  },
];

/**
 * Get daily missions for a user (deterministic selection)
 */
export async function getDailyMissions(
  userId: string,
  date: Date = new Date()
): Promise<UserMissionProgress[]> {
  if (!db) return [];
  const dateStr = getKstDate(date);

  // Get or create user missions for today
  const existingMissions = await db
    .select()
    .from(userMissions)
    .where(
      and(
        eq(userMissions.userId, userId),
        eq(userMissions.periodStart, dateStr)
      )
    );

  if (existingMissions.length > 0) {
    // Return existing missions with progress
    return existingMissions.map((um: any) => ({
      id: um.id,
      mission: DAILY_MISSION_POOL[0] as Mission, // TODO: Join with missions table
      progress: um.progress,
      isCompleted: um.isCompleted,
      rewardClaimed: um.rewardClaimed,
      completedAt: um.completedAt,
    }));
  }

  // Generate deterministic daily missions
  const selectedMissions = selectDailyMissions(userId, date);

  // Create user missions
  const createdMissions = await db.transaction(async (tx: any) => {
    const results = [];
    for (const mission of selectedMissions) {
      const [created] = await tx
        .insert(userMissions)
        .values({
          userId,
          missionId: mission.id || 'temp', // TODO: Use real mission IDs
          periodStart: dateStr,
          progress: 0,
          isCompleted: false,
          rewardClaimed: false,
        })
        .returning();

      results.push({
        id: created.id,
        mission,
        progress: 0,
        isCompleted: false,
        rewardClaimed: false,
        completedAt: null,
      });
    }
    return results;
  });

  return createdMissions;
}

/**
 * Deterministically select 3 daily missions for a user
 */
function selectDailyMissions(userId: string, date: Date): Mission[] {
  const dateStr = getKstDate(date);
  const seed = hashString(`${userId}-${dateStr}`);

  // Use seeded random to pick 3 missions
  const indices = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  const rng = seededRandom(seed);

  // Fisher-Yates shuffle with seeded random
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  return indices.slice(0, 3).map((idx) => ({
    ...DAILY_MISSION_POOL[idx],
    id: `daily-${idx}`,
    isActive: true,
  }));
}

/**
 * Update mission progress
 */
export async function updateMissionProgress(
  userId: string,
  conditionType: MissionConditionType,
  incrementBy: number = 1
): Promise<void> {
  if (!db) return;
  const dateStr = getKstDate();

  // Find active missions matching this condition type
  const activeMissions = await db
    .select()
    .from(userMissions)
    .where(
      and(
        eq(userMissions.userId, userId),
        eq(userMissions.periodStart, dateStr),
        eq(userMissions.isCompleted, false)
      )
    );

  // TODO: Filter by conditionType when missions table is properly joined

  for (const mission of activeMissions) {
    const newProgress = mission.progress + incrementBy;

    // TODO: Get conditionTarget from actual mission
    const conditionTarget = 1; // Placeholder

    const isCompleted = newProgress >= conditionTarget;

    await db
      .update(userMissions)
      .set({
        progress: newProgress,
        isCompleted,
        completedAt: isCompleted ? new Date() : null,
      })
      .where(eq(userMissions.id, mission.id));
  }
}

/**
 * Claim mission reward
 */
export async function claimMissionReward(
  userId: string,
  userMissionId: string
): Promise<{ success: boolean; pointsEarned: number; xpEarned: number }> {
  if (!db) return { success: false, pointsEarned: 0, xpEarned: 0 };
  const [userMission] = await db
    .select()
    .from(userMissions)
    .where(eq(userMissions.id, userMissionId));

  if (!userMission) {
    throw new Error('Mission not found');
  }

  if (!userMission.isCompleted) {
    throw new Error('Mission not completed');
  }

  if (userMission.rewardClaimed) {
    throw new Error('Reward already claimed');
  }

  // TODO: Get actual mission rewards
  const pointReward = 50;
  const xpReward = 10;

  await db.transaction(async (tx: any) => {
    // Mark reward as claimed
    await tx
      .update(userMissions)
      .set({ rewardClaimed: true })
      .where(eq(userMissions.id, userMissionId));

    // Award points
    await awardPoints(userId, pointReward, 'earn_mission', userMissionId);

    // Award XP
    await awardXp(userId, xpReward, 'mission', userMissionId);
  });

  return {
    success: true,
    pointsEarned: pointReward,
    xpEarned: xpReward,
  };
}

/**
 * Check if all daily missions are completed
 */
export async function checkDailyAllClearBonus(userId: string): Promise<boolean> {
  if (!db) return false;
  const dateStr = getKstDate();

  const missions = await db
    .select()
    .from(userMissions)
    .where(
      and(
        eq(userMissions.userId, userId),
        eq(userMissions.periodStart, dateStr)
      )
    );

  const allCompleted = missions.every((m: any) => m.rewardClaimed);

  if (allCompleted && missions.length === 3) {
    // Award all-clear bonus
    await awardPoints(userId, 200, 'earn_mission', undefined, '일일 미션 전체 완료 보너스');
    await awardXp(userId, 25, 'mission');
    return true;
  }

  return false;
}

// Helper functions

function getKstDate(date: Date = new Date()): string {
  const kstDate = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return kstDate.toISOString().split('T')[0];
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

function seededRandom(seed: number) {
  let state = seed;
  return function () {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

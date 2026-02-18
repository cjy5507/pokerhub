import { db } from '@/lib/db';
import { missions, userMissions, posts, comments, pokerHands, attendance, postLikes } from '@/lib/db/schema';
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
 * Get daily missions for a user from DB (deterministic selection)
 */
export async function getDailyMissions(
  userId: string,
  date: Date = new Date()
): Promise<UserMissionProgress[]> {
  if (!db) return [];
  const dateStr = getKstDate(date);

  // Check for existing user missions for today
  const existingUserMissions = await db
    .select({
      id: userMissions.id,
      missionId: userMissions.missionId,
      progress: userMissions.progress,
      isCompleted: userMissions.isCompleted,
      rewardClaimed: userMissions.rewardClaimed,
      completedAt: userMissions.completedAt,
      // Mission fields
      missionName: missions.nameKo,
      missionDesc: missions.descriptionKo,
      missionType: missions.type,
      conditionType: missions.conditionType,
      conditionTarget: missions.conditionTarget,
      pointReward: missions.pointReward,
      xpReward: missions.xpReward,
      missionIsActive: missions.isActive,
    })
    .from(userMissions)
    .innerJoin(missions, eq(userMissions.missionId, missions.id))
    .where(
      and(
        eq(userMissions.userId, userId),
        eq(userMissions.periodStart, dateStr)
      )
    );

  if (existingUserMissions.length > 0) {
    // Update progress for each mission based on actual activity
    const withUpdatedProgress = await Promise.all(
      existingUserMissions.map(async (um: any) => {
        const currentProgress = await checkMissionProgress(
          userId,
          um.conditionType as MissionConditionType,
          dateStr
        );
        const isNowCompleted = currentProgress >= um.conditionTarget;

        // Update progress in DB if changed
        if (currentProgress !== um.progress || (isNowCompleted && !um.isCompleted)) {
          await db
            .update(userMissions)
            .set({
              progress: currentProgress,
              isCompleted: isNowCompleted,
              completedAt: isNowCompleted && !um.isCompleted ? new Date() : um.completedAt,
            })
            .where(eq(userMissions.id, um.id));
        }

        return {
          id: um.id,
          mission: {
            id: um.missionId,
            type: um.missionType as MissionType,
            nameKo: um.missionName,
            descriptionKo: um.missionDesc,
            conditionType: um.conditionType as MissionConditionType,
            conditionTarget: um.conditionTarget,
            pointReward: um.pointReward,
            xpReward: um.xpReward,
            isActive: um.missionIsActive,
          },
          progress: currentProgress,
          isCompleted: isNowCompleted,
          rewardClaimed: um.rewardClaimed,
          completedAt: isNowCompleted ? (um.completedAt || new Date()) : null,
        };
      })
    );
    return withUpdatedProgress;
  }

  // No existing missions for today - select from DB and create
  const activeDailyMissions = await db
    .select()
    .from(missions)
    .where(
      and(
        eq(missions.type, 'daily'),
        eq(missions.isActive, true)
      )
    );

  if (activeDailyMissions.length === 0) {
    return [];
  }

  // Deterministically select 3 missions for this user today
  const selectedMissions = selectMissionsFromPool(activeDailyMissions, userId, date, 3);

  // Create user missions
  const createdMissions = await db.transaction(async (tx: any) => {
    const results: UserMissionProgress[] = [];
    for (const mission of selectedMissions) {
      const currentProgress = await checkMissionProgress(
        userId,
        mission.conditionType as MissionConditionType,
        dateStr
      );
      const isCompleted = currentProgress >= mission.conditionTarget;

      const [created] = await tx
        .insert(userMissions)
        .values({
          userId,
          missionId: mission.id,
          periodStart: dateStr,
          progress: currentProgress,
          isCompleted,
          rewardClaimed: false,
          completedAt: isCompleted ? new Date() : null,
        })
        .returning();

      results.push({
        id: created.id,
        mission: {
          id: mission.id,
          type: mission.type as MissionType,
          nameKo: mission.nameKo,
          descriptionKo: mission.descriptionKo,
          conditionType: mission.conditionType as MissionConditionType,
          conditionTarget: mission.conditionTarget,
          pointReward: mission.pointReward,
          xpReward: mission.xpReward,
          isActive: mission.isActive,
        },
        progress: currentProgress,
        isCompleted,
        rewardClaimed: false,
        completedAt: isCompleted ? new Date() : null,
      });
    }
    return results;
  });

  return createdMissions;
}

/**
 * Select N missions deterministically from a pool based on userId + date
 */
function selectMissionsFromPool(
  pool: typeof missions.$inferSelect[],
  userId: string,
  date: Date,
  count: number
): typeof missions.$inferSelect[] {
  if (pool.length <= count) return pool;

  const dateStr = getKstDate(date);
  const seed = hashString(`${userId}-${dateStr}`);
  const rng = seededRandom(seed);

  const indices = pool.map((_, i) => i);

  // Fisher-Yates shuffle with seeded random
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  return indices.slice(0, count).map((idx) => pool[idx]);
}

/**
 * Check actual progress for a condition type on a given date
 */
async function checkMissionProgress(
  userId: string,
  conditionType: MissionConditionType,
  dateStr: string
): Promise<number> {
  if (!db) return 0;

  const dayStart = new Date(`${dateStr}T00:00:00+09:00`);

  switch (conditionType) {
    case 'post_count': {
      const [result] = await db
        .select({ count: sql<number>`count(*)` })
        .from(posts)
        .where(
          and(
            eq(posts.authorId, userId),
            eq(posts.status, 'published'),
            gte(posts.createdAt, dayStart)
          )
        );
      return Number(result?.count || 0);
    }

    case 'comment_count': {
      const [result] = await db
        .select({ count: sql<number>`count(*)` })
        .from(comments)
        .where(
          and(
            eq(comments.authorId, userId),
            eq(comments.status, 'published'),
            gte(comments.createdAt, dayStart)
          )
        );
      return Number(result?.count || 0);
    }

    case 'hand_share': {
      const [result] = await db
        .select({ count: sql<number>`count(*)` })
        .from(pokerHands)
        .where(
          and(
            eq(pokerHands.authorId, userId),
            gte(pokerHands.createdAt, dayStart)
          )
        );
      return Number(result?.count || 0);
    }

    case 'attendance': {
      const [result] = await db
        .select({ count: sql<number>`count(*)` })
        .from(attendance)
        .where(
          and(
            eq(attendance.userId, userId),
            eq(attendance.checkDate, dateStr)
          )
        );
      return Number(result?.count || 0);
    }

    case 'like_received': {
      const [result] = await db
        .select({ count: sql<number>`count(*)` })
        .from(postLikes)
        .innerJoin(posts, eq(posts.id, postLikes.postId))
        .where(
          and(
            eq(posts.authorId, userId),
            gte(postLikes.createdAt, dayStart)
          )
        );
      return Number(result?.count || 0);
    }

    default:
      return 0;
  }
}

/**
 * Update mission progress for a user (called when user performs an action)
 */
export async function updateMissionProgress(
  userId: string,
  conditionType: MissionConditionType,
  _incrementBy: number = 1
): Promise<void> {
  if (!db) return;
  const dateStr = getKstDate();

  // Find active user missions for today that match this condition type
  const activeMissions = await db
    .select({
      umId: userMissions.id,
      umProgress: userMissions.progress,
      umIsCompleted: userMissions.isCompleted,
      conditionType: missions.conditionType,
      conditionTarget: missions.conditionTarget,
    })
    .from(userMissions)
    .innerJoin(missions, eq(userMissions.missionId, missions.id))
    .where(
      and(
        eq(userMissions.userId, userId),
        eq(userMissions.periodStart, dateStr),
        eq(userMissions.isCompleted, false),
        eq(missions.conditionType, conditionType)
      )
    );

  for (const mission of activeMissions) {
    // Get fresh progress from actual data
    const currentProgress = await checkMissionProgress(userId, conditionType, dateStr);
    const isCompleted = currentProgress >= mission.conditionTarget;

    await db
      .update(userMissions)
      .set({
        progress: currentProgress,
        isCompleted,
        completedAt: isCompleted ? new Date() : null,
      })
      .where(eq(userMissions.id, mission.umId));
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

  // Join userMissions with missions to get actual rewards
  const [result] = await db
    .select({
      umId: userMissions.id,
      isCompleted: userMissions.isCompleted,
      rewardClaimed: userMissions.rewardClaimed,
      pointReward: missions.pointReward,
      xpReward: missions.xpReward,
    })
    .from(userMissions)
    .innerJoin(missions, eq(userMissions.missionId, missions.id))
    .where(and(eq(userMissions.id, userMissionId), eq(userMissions.userId, userId)));

  if (!result) {
    throw new Error('Mission not found');
  }

  if (!result.isCompleted) {
    throw new Error('Mission not completed');
  }

  if (result.rewardClaimed) {
    throw new Error('Reward already claimed');
  }

  const pointReward = result.pointReward;
  const xpReward = result.xpReward;

  await db.transaction(async (tx: any) => {
    // Mark reward as claimed
    await tx
      .update(userMissions)
      .set({ rewardClaimed: true })
      .where(eq(userMissions.id, userMissionId));
  });

  // Award points and XP outside transaction (they have their own transactions)
  if (pointReward > 0) {
    await awardPoints(userId, pointReward, 'earn_mission', userMissionId);
  }
  if (xpReward > 0) {
    await awardXp(userId, xpReward, 'mission', userMissionId);
  }

  return {
    success: true,
    pointsEarned: pointReward,
    xpEarned: xpReward,
  };
}

/**
 * Check if all daily missions are completed for bonus
 */
export async function checkDailyAllClearBonus(userId: string): Promise<boolean> {
  if (!db) return false;
  const dateStr = getKstDate();

  const todayMissions = await db
    .select()
    .from(userMissions)
    .where(
      and(
        eq(userMissions.userId, userId),
        eq(userMissions.periodStart, dateStr)
      )
    );

  const allClaimed = todayMissions.every((m: any) => m.rewardClaimed);

  if (allClaimed && todayMissions.length >= 3) {
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
    hash = hash & hash;
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

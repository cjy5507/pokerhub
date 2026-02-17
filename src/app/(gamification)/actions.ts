'use server';

import { checkAttendance, getAttendanceCalendar, getStreakInfo, hasCheckedInToday } from '@/lib/gamification/attendance';
import { getDailyMissions, claimMissionReward, checkDailyAllClearBonus } from '@/lib/gamification/missions';
import { getPointHistory, getPointBalance } from '@/lib/gamification/points';
import { getLevelProgress } from '@/lib/gamification/xp';
import { getSession } from '@/lib/auth/session';
import { redirect } from 'next/navigation';

/**
 * Check attendance for the current user
 */
export async function checkAttendanceAction() {
  const session = await getSession();

  if (!session?.userId) {
    throw new Error('Unauthorized');
  }

  try {
    const result = await checkAttendance(session.userId);
    return {
      success: true,
      data: result,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check attendance',
    };
  }
}

/**
 * Get attendance calendar for a specific month
 */
export async function getAttendanceCalendarAction(year: number, month: number) {
  const session = await getSession();

  if (!session?.userId) {
    throw new Error('Unauthorized');
  }

  try {
    const records = await getAttendanceCalendar(session.userId, year, month);
    return {
      success: true,
      data: records,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get calendar',
    };
  }
}

/**
 * Get streak information
 */
export async function getStreakInfoAction() {
  const session = await getSession();

  if (!session?.userId) {
    throw new Error('Unauthorized');
  }

  try {
    const streak = await getStreakInfo(session.userId);
    return {
      success: true,
      data: streak,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get streak info',
    };
  }
}

/**
 * Check if user has checked in today
 */
export async function hasCheckedInTodayAction() {
  const session = await getSession();

  if (!session?.userId) {
    return false;
  }

  return await hasCheckedInToday(session.userId);
}

/**
 * Get daily missions
 */
export async function getDailyMissionsAction() {
  const session = await getSession();

  if (!session?.userId) {
    throw new Error('Unauthorized');
  }

  try {
    const missions = await getDailyMissions(session.userId);
    return {
      success: true,
      data: missions,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get missions',
    };
  }
}

/**
 * Claim mission reward
 */
export async function claimMissionRewardAction(userMissionId: string) {
  const session = await getSession();

  if (!session?.userId) {
    throw new Error('Unauthorized');
  }

  try {
    const result = await claimMissionReward(session.userId, userMissionId);

    // Check for all-clear bonus
    await checkDailyAllClearBonus(session.userId);

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to claim reward',
    };
  }
}

/**
 * Get point history
 */
export async function getPointHistoryAction(page: number = 1, limit: number = 20) {
  const session = await getSession();

  if (!session?.userId) {
    throw new Error('Unauthorized');
  }

  try {
    const result = await getPointHistory(session.userId, page, limit);
    return {
      success: true,
      data: result,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get point history',
    };
  }
}

/**
 * Get point balance
 */
export async function getPointBalanceAction() {
  const session = await getSession();

  if (!session?.userId) {
    throw new Error('Unauthorized');
  }

  try {
    const balance = await getPointBalance(session.userId);
    return {
      success: true,
      data: balance,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get balance',
    };
  }
}

/**
 * Get level progress
 */
export async function getLevelProgressAction() {
  const session = await getSession();

  if (!session?.userId) {
    throw new Error('Unauthorized');
  }

  try {
    const progress = await getLevelProgress(session.userId);
    return {
      success: true,
      data: progress,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get level progress',
    };
  }
}

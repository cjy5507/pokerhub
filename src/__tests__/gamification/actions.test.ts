import { describe, it, expect, beforeEach, vi, type MockedFunction } from 'vitest';
import { mockUserSession, resetMocks } from '../helpers/mocks';

// ---------------------------------------------------------------------------
// Module mocks — must be declared before any import of the tested module
// ---------------------------------------------------------------------------

vi.mock('@/lib/auth/session', () => ({
  getSession: vi.fn(),
}));

vi.mock('@/lib/gamification/attendance', () => ({
  checkAttendance: vi.fn(),
  getAttendanceCalendar: vi.fn(),
  getStreakInfo: vi.fn(),
  hasCheckedInToday: vi.fn(),
}));

vi.mock('@/lib/gamification/missions', () => ({
  getDailyMissions: vi.fn(),
  claimMissionReward: vi.fn(),
  checkDailyAllClearBonus: vi.fn(),
}));

vi.mock('@/lib/gamification/points', () => ({
  getPointHistory: vi.fn(),
  getPointBalance: vi.fn(),
}));

vi.mock('@/lib/gamification/xp', () => ({
  getLevelProgress: vi.fn(),
}));

// next/headers stub — required so 'use server' files load in plain Node
vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  }),
}));

// next/navigation stub (redirect is imported by the actions file)
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
  notFound: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Lazy imports — must come AFTER vi.mock() calls
// ---------------------------------------------------------------------------

import { getSession } from '@/lib/auth/session';
import {
  checkAttendance,
  getAttendanceCalendar,
  getStreakInfo,
  hasCheckedInToday,
} from '@/lib/gamification/attendance';
import {
  getDailyMissions,
  claimMissionReward,
  checkDailyAllClearBonus,
} from '@/lib/gamification/missions';
import { getPointHistory, getPointBalance } from '@/lib/gamification/points';
import { getLevelProgress } from '@/lib/gamification/xp';

import {
  checkAttendanceAction,
  getAttendanceCalendarAction,
  getStreakInfoAction,
  hasCheckedInTodayAction,
  getDailyMissionsAction,
  claimMissionRewardAction,
  getPointHistoryAction,
  getPointBalanceAction,
  getLevelProgressAction,
} from '@/app/(gamification)/actions';

const mockGetSession = getSession as MockedFunction<typeof getSession>;
const mockCheckAttendance = checkAttendance as MockedFunction<typeof checkAttendance>;
const mockGetAttendanceCalendar = getAttendanceCalendar as MockedFunction<
  typeof getAttendanceCalendar
>;
const mockGetStreakInfo = getStreakInfo as MockedFunction<typeof getStreakInfo>;
const mockHasCheckedInToday = hasCheckedInToday as MockedFunction<typeof hasCheckedInToday>;
const mockGetDailyMissions = getDailyMissions as MockedFunction<typeof getDailyMissions>;
const mockClaimMissionReward = claimMissionReward as MockedFunction<typeof claimMissionReward>;
const mockCheckDailyAllClearBonus = checkDailyAllClearBonus as MockedFunction<
  typeof checkDailyAllClearBonus
>;
const mockGetPointHistory = getPointHistory as MockedFunction<typeof getPointHistory>;
const mockGetPointBalance = getPointBalance as MockedFunction<typeof getPointBalance>;
const mockGetLevelProgress = getLevelProgress as MockedFunction<typeof getLevelProgress>;

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  resetMocks();
});

// ===========================================================================
// checkAttendanceAction
// ===========================================================================

describe('checkAttendanceAction', () => {
  it('throws Unauthorized when there is no session', async () => {
    mockGetSession.mockResolvedValueOnce(null);

    await expect(checkAttendanceAction()).rejects.toThrow('Unauthorized');
  });

  it('throws Unauthorized when session has no userId', async () => {
    mockGetSession.mockResolvedValueOnce({ userId: '' } as any);

    await expect(checkAttendanceAction()).rejects.toThrow('Unauthorized');
  });

  it('delegates to checkAttendance with the session userId on success', async () => {
    mockGetSession.mockResolvedValueOnce(mockUserSession as any);

    const attendanceData = { streak: 3, pointsEarned: 50, xpEarned: 10 };
    mockCheckAttendance.mockResolvedValueOnce(attendanceData as any);

    const result = await checkAttendanceAction();

    expect(mockCheckAttendance).toHaveBeenCalledWith(mockUserSession.userId);
    expect(result).toEqual({ success: true, data: attendanceData });
  });

  it('returns success: false when checkAttendance throws', async () => {
    mockGetSession.mockResolvedValueOnce(mockUserSession as any);
    mockCheckAttendance.mockRejectedValueOnce(new Error('Already checked in today'));

    const result = await checkAttendanceAction();

    expect(result).toEqual({ success: false, error: 'Already checked in today' });
  });

  it('returns generic error message for non-Error throws', async () => {
    mockGetSession.mockResolvedValueOnce(mockUserSession as any);
    mockCheckAttendance.mockRejectedValueOnce('string error');

    const result = await checkAttendanceAction();

    expect(result).toEqual({ success: false, error: 'Failed to check attendance' });
  });
});

// ===========================================================================
// getAttendanceCalendarAction
// ===========================================================================

describe('getAttendanceCalendarAction', () => {
  it('throws Unauthorized when not authenticated', async () => {
    mockGetSession.mockResolvedValueOnce(null);

    await expect(getAttendanceCalendarAction(2026, 2)).rejects.toThrow('Unauthorized');
  });

  it('delegates to getAttendanceCalendar with userId, year, and month', async () => {
    mockGetSession.mockResolvedValueOnce(mockUserSession as any);

    const calendarData = [{ date: '2026-02-01', checkedIn: true }];
    mockGetAttendanceCalendar.mockResolvedValueOnce(calendarData as any);

    const result = await getAttendanceCalendarAction(2026, 2);

    expect(mockGetAttendanceCalendar).toHaveBeenCalledWith(mockUserSession.userId, 2026, 2);
    expect(result).toEqual({ success: true, data: calendarData });
  });

  it('returns success: false on library error', async () => {
    mockGetSession.mockResolvedValueOnce(mockUserSession as any);
    mockGetAttendanceCalendar.mockRejectedValueOnce(new Error('DB error'));

    const result = await getAttendanceCalendarAction(2026, 2);

    expect(result).toEqual({ success: false, error: 'DB error' });
  });
});

// ===========================================================================
// getStreakInfoAction
// ===========================================================================

describe('getStreakInfoAction', () => {
  it('throws Unauthorized when not authenticated', async () => {
    mockGetSession.mockResolvedValueOnce(null);

    await expect(getStreakInfoAction()).rejects.toThrow('Unauthorized');
  });

  it('delegates to getStreakInfo with the session userId', async () => {
    mockGetSession.mockResolvedValueOnce(mockUserSession as any);

    const streakData = { currentStreak: 7, longestStreak: 14 };
    mockGetStreakInfo.mockResolvedValueOnce(streakData as any);

    const result = await getStreakInfoAction();

    expect(mockGetStreakInfo).toHaveBeenCalledWith(mockUserSession.userId);
    expect(result).toEqual({ success: true, data: streakData });
  });

  it('returns success: false on library error', async () => {
    mockGetSession.mockResolvedValueOnce(mockUserSession as any);
    mockGetStreakInfo.mockRejectedValueOnce(new Error('Failed to get streak info'));

    const result = await getStreakInfoAction();

    expect(result.success).toBe(false);
    expect(result.error).toBe('Failed to get streak info');
  });
});

// ===========================================================================
// hasCheckedInTodayAction
// ===========================================================================

describe('hasCheckedInTodayAction', () => {
  it('returns false (not an error) when not authenticated', async () => {
    mockGetSession.mockResolvedValueOnce(null);

    const result = await hasCheckedInTodayAction();

    expect(result).toBe(false);
    // The lib function must NOT be called when there is no session
    expect(mockHasCheckedInToday).not.toHaveBeenCalled();
  });

  it('returns false (not an error) when session has no userId', async () => {
    mockGetSession.mockResolvedValueOnce({ userId: '' } as any);

    const result = await hasCheckedInTodayAction();

    expect(result).toBe(false);
    expect(mockHasCheckedInToday).not.toHaveBeenCalled();
  });

  it('delegates to hasCheckedInToday and returns true when already checked in', async () => {
    mockGetSession.mockResolvedValueOnce(mockUserSession as any);
    mockHasCheckedInToday.mockResolvedValueOnce(true);

    const result = await hasCheckedInTodayAction();

    expect(mockHasCheckedInToday).toHaveBeenCalledWith(mockUserSession.userId);
    expect(result).toBe(true);
  });

  it('delegates to hasCheckedInToday and returns false when not yet checked in', async () => {
    mockGetSession.mockResolvedValueOnce(mockUserSession as any);
    mockHasCheckedInToday.mockResolvedValueOnce(false);

    const result = await hasCheckedInTodayAction();

    expect(result).toBe(false);
  });
});

// ===========================================================================
// getDailyMissionsAction
// ===========================================================================

describe('getDailyMissionsAction', () => {
  it('throws Unauthorized when not authenticated', async () => {
    mockGetSession.mockResolvedValueOnce(null);

    await expect(getDailyMissionsAction()).rejects.toThrow('Unauthorized');
  });

  it('delegates to getDailyMissions with the session userId', async () => {
    mockGetSession.mockResolvedValueOnce(mockUserSession as any);

    const missions = [{ id: 'm1', name: 'Daily Login', completed: false }];
    mockGetDailyMissions.mockResolvedValueOnce(missions as any);

    const result = await getDailyMissionsAction();

    expect(mockGetDailyMissions).toHaveBeenCalledWith(mockUserSession.userId);
    expect(result).toEqual({ success: true, data: missions });
  });

  it('returns success: false on library error', async () => {
    mockGetSession.mockResolvedValueOnce(mockUserSession as any);
    mockGetDailyMissions.mockRejectedValueOnce(new Error('Failed to get missions'));

    const result = await getDailyMissionsAction();

    expect(result.success).toBe(false);
    expect(result.error).toBe('Failed to get missions');
  });

  it('returns generic error message for non-Error throws', async () => {
    mockGetSession.mockResolvedValueOnce(mockUserSession as any);
    mockGetDailyMissions.mockRejectedValueOnce('oops');

    const result = await getDailyMissionsAction();

    expect(result).toEqual({ success: false, error: 'Failed to get missions' });
  });
});

// ===========================================================================
// claimMissionRewardAction
// ===========================================================================

describe('claimMissionRewardAction', () => {
  const USER_MISSION_ID = 'user-mission-uuid-001';

  it('throws Unauthorized when not authenticated', async () => {
    mockGetSession.mockResolvedValueOnce(null);

    await expect(claimMissionRewardAction(USER_MISSION_ID)).rejects.toThrow('Unauthorized');
  });

  it('delegates to claimMissionReward with userId and userMissionId', async () => {
    mockGetSession.mockResolvedValueOnce(mockUserSession as any);

    const claimResult = { pointsEarned: 50, xpEarned: 20 };
    mockClaimMissionReward.mockResolvedValueOnce(claimResult as any);
    mockCheckDailyAllClearBonus.mockResolvedValueOnce(undefined as any);

    const result = await claimMissionRewardAction(USER_MISSION_ID);

    expect(mockClaimMissionReward).toHaveBeenCalledWith(mockUserSession.userId, USER_MISSION_ID);
    expect(result).toEqual({ success: true, data: claimResult });
  });

  it('calls checkDailyAllClearBonus after a successful claim', async () => {
    mockGetSession.mockResolvedValueOnce(mockUserSession as any);

    mockClaimMissionReward.mockResolvedValueOnce({ pointsEarned: 30 } as any);
    mockCheckDailyAllClearBonus.mockResolvedValueOnce(undefined as any);

    await claimMissionRewardAction(USER_MISSION_ID);

    expect(mockCheckDailyAllClearBonus).toHaveBeenCalledTimes(1);
    expect(mockCheckDailyAllClearBonus).toHaveBeenCalledWith(mockUserSession.userId);
  });

  it('returns success: false when claimMissionReward throws', async () => {
    mockGetSession.mockResolvedValueOnce(mockUserSession as any);
    mockClaimMissionReward.mockRejectedValueOnce(new Error('Mission already claimed'));

    const result = await claimMissionRewardAction(USER_MISSION_ID);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Mission already claimed');
  });

  it('does not propagate checkDailyAllClearBonus errors as test failures (it is fire-and-maybe-forget inside try)', async () => {
    // The implementation awaits checkDailyAllClearBonus inside the try block,
    // so if it throws the outer catch wraps it into success: false.
    mockGetSession.mockResolvedValueOnce(mockUserSession as any);
    mockClaimMissionReward.mockResolvedValueOnce({ pointsEarned: 50 } as any);
    mockCheckDailyAllClearBonus.mockRejectedValueOnce(new Error('Bonus check failed'));

    const result = await claimMissionRewardAction(USER_MISSION_ID);

    // The error is caught and returned as success: false
    expect(result.success).toBe(false);
    expect(result.error).toBe('Bonus check failed');
  });

  it('returns generic error message for non-Error throws', async () => {
    mockGetSession.mockResolvedValueOnce(mockUserSession as any);
    mockClaimMissionReward.mockRejectedValueOnce(42);

    const result = await claimMissionRewardAction(USER_MISSION_ID);

    expect(result).toEqual({ success: false, error: 'Failed to claim reward' });
  });
});

// ===========================================================================
// getPointHistoryAction
// ===========================================================================

describe('getPointHistoryAction', () => {
  it('throws Unauthorized when not authenticated', async () => {
    mockGetSession.mockResolvedValueOnce(null);

    await expect(getPointHistoryAction()).rejects.toThrow('Unauthorized');
  });

  it('delegates to getPointHistory with userId, default page=1 and limit=20', async () => {
    mockGetSession.mockResolvedValueOnce(mockUserSession as any);

    const historyData = { items: [], total: 0 };
    mockGetPointHistory.mockResolvedValueOnce(historyData as any);

    const result = await getPointHistoryAction();

    expect(mockGetPointHistory).toHaveBeenCalledWith(mockUserSession.userId, 1, 20);
    expect(result).toEqual({ success: true, data: historyData });
  });

  it('passes custom page and limit arguments through to getPointHistory', async () => {
    mockGetSession.mockResolvedValueOnce(mockUserSession as any);

    const historyData = { items: [{ id: 'tx1' }], total: 1 };
    mockGetPointHistory.mockResolvedValueOnce(historyData as any);

    const result = await getPointHistoryAction(3, 10);

    expect(mockGetPointHistory).toHaveBeenCalledWith(mockUserSession.userId, 3, 10);
    expect(result).toEqual({ success: true, data: historyData });
  });

  it('returns success: false on library error', async () => {
    mockGetSession.mockResolvedValueOnce(mockUserSession as any);
    mockGetPointHistory.mockRejectedValueOnce(new Error('Failed to get point history'));

    const result = await getPointHistoryAction();

    expect(result.success).toBe(false);
    expect(result.error).toBe('Failed to get point history');
  });
});

// ===========================================================================
// getPointBalanceAction
// ===========================================================================

describe('getPointBalanceAction', () => {
  it('throws Unauthorized when not authenticated', async () => {
    mockGetSession.mockResolvedValueOnce(null);

    await expect(getPointBalanceAction()).rejects.toThrow('Unauthorized');
  });

  it('delegates to getPointBalance with the session userId', async () => {
    mockGetSession.mockResolvedValueOnce(mockUserSession as any);

    const balanceData = { points: 1500 };
    mockGetPointBalance.mockResolvedValueOnce(balanceData as any);

    const result = await getPointBalanceAction();

    expect(mockGetPointBalance).toHaveBeenCalledWith(mockUserSession.userId);
    expect(result).toEqual({ success: true, data: balanceData });
  });

  it('returns success: false on library error', async () => {
    mockGetSession.mockResolvedValueOnce(mockUserSession as any);
    mockGetPointBalance.mockRejectedValueOnce(new Error('Failed to get balance'));

    const result = await getPointBalanceAction();

    expect(result.success).toBe(false);
    expect(result.error).toBe('Failed to get balance');
  });

  it('returns generic error message for non-Error throws', async () => {
    mockGetSession.mockResolvedValueOnce(mockUserSession as any);
    mockGetPointBalance.mockRejectedValueOnce({ code: 500 });

    const result = await getPointBalanceAction();

    expect(result).toEqual({ success: false, error: 'Failed to get balance' });
  });
});

// ===========================================================================
// getLevelProgressAction
// ===========================================================================

describe('getLevelProgressAction', () => {
  it('throws Unauthorized when not authenticated', async () => {
    mockGetSession.mockResolvedValueOnce(null);

    await expect(getLevelProgressAction()).rejects.toThrow('Unauthorized');
  });

  it('delegates to getLevelProgress with the session userId', async () => {
    mockGetSession.mockResolvedValueOnce(mockUserSession as any);

    const progressData = { level: 5, currentXp: 320, xpToNextLevel: 500, percentage: 64 };
    mockGetLevelProgress.mockResolvedValueOnce(progressData as any);

    const result = await getLevelProgressAction();

    expect(mockGetLevelProgress).toHaveBeenCalledWith(mockUserSession.userId);
    expect(result).toEqual({ success: true, data: progressData });
  });

  it('returns success: false on library error', async () => {
    mockGetSession.mockResolvedValueOnce(mockUserSession as any);
    mockGetLevelProgress.mockRejectedValueOnce(new Error('Failed to get level progress'));

    const result = await getLevelProgressAction();

    expect(result.success).toBe(false);
    expect(result.error).toBe('Failed to get level progress');
  });

  it('returns generic error message for non-Error throws', async () => {
    mockGetSession.mockResolvedValueOnce(mockUserSession as any);
    mockGetLevelProgress.mockRejectedValueOnce(null);

    const result = await getLevelProgressAction();

    expect(result).toEqual({ success: false, error: 'Failed to get level progress' });
  });
});

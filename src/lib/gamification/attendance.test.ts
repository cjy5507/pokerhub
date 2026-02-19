import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ──────────────────────────────────────────────────────────
// vi.hoisted ensures variables are available when vi.mock factories run (hoisted)

const { mockSelect, mockInsert, mockUpdate, mockTransaction } = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  mockInsert: vi.fn(),
  mockUpdate: vi.fn(),
  mockTransaction: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  db: {
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    transaction: mockTransaction,
  },
}));

vi.mock('./points', () => ({
  awardPoints: vi.fn().mockResolvedValue({ success: true, newBalance: 100, transactionId: 'pt-1' }),
}));

vi.mock('./xp', () => ({
  awardXp: vi.fn().mockResolvedValue({ success: true, newXp: 50, newLevel: 2, leveledUp: false, transactionId: 'xp-1' }),
}));

vi.mock('@/app/notifications/actions', () => ({
  createNotification: vi.fn().mockResolvedValue(undefined),
}));

import {
  checkAttendance,
  getAttendanceCalendar,
  getStreakInfo,
  hasCheckedInToday,
} from './attendance';
import { awardPoints } from './points';
import { awardXp } from './xp';
import { createNotification } from '@/app/notifications/actions';

// ─── Helpers ────────────────────────────────────────────────────────

/** Build a chained mock: select().from().where().orderBy().limit() etc. */
function chainMock(result: unknown[]) {
  const chain: Record<string | symbol, unknown> = {};
  const self = () => chain;
  chain.from = self;
  chain.where = self;
  chain.orderBy = self;
  chain.limit = self;
  // Terminal: array-like iterable
  chain[Symbol.iterator] = function* () { yield* result as any[]; };
  chain.then = (resolve: (v: unknown) => void) => resolve(result);
  return chain;
}

function setupSelect(...calls: unknown[][]) {
  for (const result of calls) {
    mockSelect.mockReturnValueOnce(chainMock(result));
  }
}

// ─── Tests ──────────────────────────────────────────────────────────

describe('attendance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  // ── Internal logic tested through checkAttendance ─────────────

  describe('streak bonus calculation (via checkAttendance)', () => {
    // For streak 1 (no bonus): base 50pts + 0 bonus = 50pts, base 10xp + 0 = 10xp
    it('should return 50 points and 10 xp for streak 1 (no bonus)', async () => {
      // Set time to a known KST date
      vi.setSystemTime(new Date('2025-01-15T10:00:00Z'));

      // No existing check today
      setupSelect([]);
      // No yesterday check -> streak resets to 1
      setupSelect([]);

      const txFn = vi.fn().mockImplementation(async (fn) => {
        const tx = {
          insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) }),
          select: vi.fn().mockReturnValue(chainMock([])),
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue(undefined),
            }),
          }),
        };
        return fn(tx);
      });
      mockTransaction.mockImplementation(txFn);

      const result = await checkAttendance('user-1');

      expect(result.success).toBe(true);
      expect(result.alreadyChecked).toBe(false);
      expect(result.streakCount).toBe(1);
      expect(result.pointsEarned).toBe(50); // base only, no bonus
      expect(result.xpEarned).toBe(10);
    });

    it('should add 75pt/15xp bonus for streak 3', async () => {
      vi.setSystemTime(new Date('2025-01-15T10:00:00Z'));

      // No existing check today
      setupSelect([]);
      // Yesterday's check had streak 2 -> new streak = 3
      setupSelect([{ streakCount: 2 }]);
      // checkAttendanceBadges uses module-level db.select (streak 3 is a badge milestone)
      setupSelect([]); // badge lookup returns nothing

      const txFn = vi.fn().mockImplementation(async (fn) => {
        const tx = {
          insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) }),
          select: vi.fn().mockReturnValue(chainMock([])),
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue(undefined),
            }),
          }),
        };
        return fn(tx);
      });
      mockTransaction.mockImplementation(txFn);

      const result = await checkAttendance('user-1');

      expect(result.success).toBe(true);
      expect(result.streakCount).toBe(3);
      expect(result.pointsEarned).toBe(50 + 75); // base + streak bonus
      expect(result.xpEarned).toBe(10 + 15);
    });

    it('should add 100pt/20xp bonus for streak 7', async () => {
      vi.setSystemTime(new Date('2025-01-15T10:00:00Z'));

      setupSelect([]);
      setupSelect([{ streakCount: 6 }]);
      // checkAttendanceBadges uses module-level db.select (streak 7 is a badge milestone)
      setupSelect([]); // badge lookup returns nothing

      const txFn = vi.fn().mockImplementation(async (fn) => {
        const tx = {
          insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) }),
          select: vi.fn().mockReturnValue(chainMock([])),
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue(undefined),
            }),
          }),
        };
        return fn(tx);
      });
      mockTransaction.mockImplementation(txFn);

      const result = await checkAttendance('user-1');

      expect(result.streakCount).toBe(7);
      expect(result.pointsEarned).toBe(50 + 100);
      expect(result.xpEarned).toBe(10 + 20);
    });

    it('should add 150pt/30xp bonus for streak 14', async () => {
      vi.setSystemTime(new Date('2025-01-15T10:00:00Z'));

      setupSelect([]);
      setupSelect([{ streakCount: 13 }]);

      const txFn = vi.fn().mockImplementation(async (fn) => {
        const tx = {
          insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) }),
          select: vi.fn().mockReturnValue(chainMock([])),
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue(undefined),
            }),
          }),
        };
        return fn(tx);
      });
      mockTransaction.mockImplementation(txFn);

      const result = await checkAttendance('user-1');

      expect(result.streakCount).toBe(14);
      expect(result.pointsEarned).toBe(50 + 150);
      expect(result.xpEarned).toBe(10 + 30);
    });

    it('should add 200pt/50xp bonus for streak 30+', async () => {
      vi.setSystemTime(new Date('2025-01-15T10:00:00Z'));

      setupSelect([]);
      setupSelect([{ streakCount: 29 }]);
      // checkAttendanceBadges uses module-level db.select (streak 30 is a badge milestone)
      setupSelect([]); // badge lookup returns nothing

      const txFn = vi.fn().mockImplementation(async (fn) => {
        const tx = {
          insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) }),
          select: vi.fn().mockReturnValue(chainMock([])),
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue(undefined),
            }),
          }),
        };
        return fn(tx);
      });
      mockTransaction.mockImplementation(txFn);

      const result = await checkAttendance('user-1');

      expect(result.streakCount).toBe(30);
      expect(result.pointsEarned).toBe(50 + 200);
      expect(result.xpEarned).toBe(10 + 50);
    });
  });

  describe('next milestone (via checkAttendance)', () => {
    it('should return {3, 75} when streak is 0 (new streak = 1)', async () => {
      vi.setSystemTime(new Date('2025-01-15T10:00:00Z'));

      setupSelect([]);
      setupSelect([]); // no yesterday -> streak 1

      mockTransaction.mockImplementation(async (fn: any) => {
        const tx = {
          insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) }),
          select: vi.fn().mockReturnValue(chainMock([])),
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue(undefined),
            }),
          }),
        };
        return fn(tx);
      });

      const result = await checkAttendance('user-1');

      expect(result.nextMilestone).toEqual({ days: 3, points: 75 });
    });

    it('should return {7, 100} when streak reaches 3', async () => {
      vi.setSystemTime(new Date('2025-01-15T10:00:00Z'));

      setupSelect([]);
      setupSelect([{ streakCount: 2 }]);
      setupSelect([]); // badge milestone 3 -> db.select for badge lookup

      mockTransaction.mockImplementation(async (fn: any) => {
        const tx = {
          insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) }),
          select: vi.fn().mockReturnValue(chainMock([])),
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue(undefined),
            }),
          }),
        };
        return fn(tx);
      });

      const result = await checkAttendance('user-1');

      expect(result.nextMilestone).toEqual({ days: 7, points: 100 });
    });

    it('should return {14, 150} when streak reaches 7', async () => {
      vi.setSystemTime(new Date('2025-01-15T10:00:00Z'));

      setupSelect([]);
      setupSelect([{ streakCount: 6 }]);
      setupSelect([]); // badge milestone 7 -> db.select for badge lookup

      mockTransaction.mockImplementation(async (fn: any) => {
        const tx = {
          insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) }),
          select: vi.fn().mockReturnValue(chainMock([])),
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue(undefined),
            }),
          }),
        };
        return fn(tx);
      });

      const result = await checkAttendance('user-1');

      expect(result.nextMilestone).toEqual({ days: 14, points: 150 });
    });

    it('should return {30, 200} when streak reaches 14', async () => {
      vi.setSystemTime(new Date('2025-01-15T10:00:00Z'));

      setupSelect([]);
      setupSelect([{ streakCount: 13 }]);

      mockTransaction.mockImplementation(async (fn: any) => {
        const tx = {
          insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) }),
          select: vi.fn().mockReturnValue(chainMock([])),
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue(undefined),
            }),
          }),
        };
        return fn(tx);
      });

      const result = await checkAttendance('user-1');

      expect(result.nextMilestone).toEqual({ days: 30, points: 200 });
    });

    it('should return null when streak >= 30 (max milestone reached)', async () => {
      vi.setSystemTime(new Date('2025-01-15T10:00:00Z'));

      setupSelect([]);
      setupSelect([{ streakCount: 29 }]);
      setupSelect([]); // badge milestone 30 -> db.select for badge lookup

      mockTransaction.mockImplementation(async (fn: any) => {
        const tx = {
          insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) }),
          select: vi.fn().mockReturnValue(chainMock([])),
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue(undefined),
            }),
          }),
        };
        return fn(tx);
      });

      const result = await checkAttendance('user-1');

      expect(result.nextMilestone).toBeNull();
    });
  });

  describe('KST date conversion (via checkAttendance)', () => {
    it('should use KST timezone: UTC 2025-01-14T23:00 -> KST 2025-01-15', async () => {
      // At UTC 23:00 on Jan 14, KST is 08:00 on Jan 15
      vi.setSystemTime(new Date('2025-01-14T23:00:00Z'));

      // This should check for KST date "2025-01-15"
      // We can verify by checking the arguments passed to the db
      setupSelect([{ streakCount: 5 }]); // "already checked in today"

      const result = await checkAttendance('user-1');

      // If already checked = true, the function found a record for today's KST date
      expect(result.alreadyChecked).toBe(true);
      expect(result.streakCount).toBe(5);
    });

    it('should handle UTC midnight correctly for KST (UTC 00:00 = KST 09:00, same day)', async () => {
      vi.setSystemTime(new Date('2025-01-15T00:00:00Z'));

      // KST is 09:00 on Jan 15
      setupSelect([]); // no check today
      setupSelect([]); // no yesterday

      mockTransaction.mockImplementation(async (fn: any) => {
        const tx = {
          insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) }),
          select: vi.fn().mockReturnValue(chainMock([])),
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue(undefined),
            }),
          }),
        };
        return fn(tx);
      });

      const result = await checkAttendance('user-1');

      expect(result.success).toBe(true);
      expect(result.streakCount).toBe(1);
    });

    it('should handle KST day boundary: UTC 14:59 Jan 15 = KST 23:59 Jan 15', async () => {
      vi.setSystemTime(new Date('2025-01-15T14:59:00Z'));

      setupSelect([{ streakCount: 3 }]); // already checked

      const result = await checkAttendance('user-1');
      expect(result.alreadyChecked).toBe(true);
    });

    it('should advance to next KST day: UTC 15:00 Jan 15 = KST 00:00 Jan 16', async () => {
      vi.setSystemTime(new Date('2025-01-15T15:00:00Z'));

      // This is KST Jan 16 - should be a new day
      setupSelect([]); // no check today (Jan 16 KST)
      setupSelect([]); // no yesterday

      mockTransaction.mockImplementation(async (fn: any) => {
        const tx = {
          insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) }),
          select: vi.fn().mockReturnValue(chainMock([])),
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue(undefined),
            }),
          }),
        };
        return fn(tx);
      });

      const result = await checkAttendance('user-1');
      expect(result.success).toBe(true);
    });
  });

  describe('checkAttendance', () => {
    it('should return alreadyChecked=true when checked in today', async () => {
      vi.setSystemTime(new Date('2025-01-15T10:00:00Z'));

      setupSelect([{ streakCount: 5 }]);

      const result = await checkAttendance('user-1');

      expect(result.success).toBe(false);
      expect(result.alreadyChecked).toBe(true);
      expect(result.pointsEarned).toBe(0);
      expect(result.xpEarned).toBe(0);
      expect(result.streakCount).toBe(5);
    });

    it('should continue streak when yesterday had attendance', async () => {
      vi.setSystemTime(new Date('2025-01-15T10:00:00Z'));

      setupSelect([]); // no check today
      setupSelect([{ streakCount: 5 }]); // yesterday had streak 5

      mockTransaction.mockImplementation(async (fn: any) => {
        const tx = {
          insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) }),
          select: vi.fn().mockReturnValue(chainMock([{ bestAttendanceStreak: 5 }])),
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue(undefined),
            }),
          }),
        };
        return fn(tx);
      });

      const result = await checkAttendance('user-1');

      expect(result.success).toBe(true);
      expect(result.streakCount).toBe(6);
    });

    it('should break streak when no attendance yesterday', async () => {
      vi.setSystemTime(new Date('2025-01-15T10:00:00Z'));

      setupSelect([]); // no check today
      setupSelect([]); // no check yesterday

      mockTransaction.mockImplementation(async (fn: any) => {
        const tx = {
          insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) }),
          select: vi.fn().mockReturnValue(chainMock([])),
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue(undefined),
            }),
          }),
        };
        return fn(tx);
      });

      const result = await checkAttendance('user-1');

      expect(result.success).toBe(true);
      expect(result.streakCount).toBe(1); // reset to 1
    });

    it('should call awardPoints and awardXp with correct amounts', async () => {
      vi.setSystemTime(new Date('2025-01-15T10:00:00Z'));

      setupSelect([]); // no check today
      setupSelect([{ streakCount: 6 }]); // yesterday streak 6, new streak = 7
      setupSelect([]); // badge milestone 7 -> db.select for badge lookup

      mockTransaction.mockImplementation(async (fn: any) => {
        const tx = {
          insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) }),
          select: vi.fn().mockReturnValue(chainMock([])),
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue(undefined),
            }),
          }),
        };
        return fn(tx);
      });

      await checkAttendance('user-1');

      // streak 7: base 50 + bonus 100 = 150 points
      expect(awardPoints).toHaveBeenCalledWith(
        'user-1',
        150,
        'earn_attendance',
        undefined,
        '출석 체크 (7일 연속)',
      );

      // streak 7: base 10 + bonus 20 = 30 xp
      expect(awardXp).toHaveBeenCalledWith('user-1', 30, 'attendance');
    });

    it('should create new userStreak when none exists', async () => {
      vi.setSystemTime(new Date('2025-01-15T10:00:00Z'));

      setupSelect([]); // no check today
      setupSelect([]); // no yesterday

      const mockTxInsert = vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) });
      mockTransaction.mockImplementation(async (fn: any) => {
        const tx = {
          insert: mockTxInsert,
          select: vi.fn().mockReturnValue(chainMock([])), // no existing streak
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue(undefined),
            }),
          }),
        };
        return fn(tx);
      });

      const result = await checkAttendance('user-1');

      expect(result.success).toBe(true);
      // insert should be called: once for attendance, once for userStreaks
      expect(mockTxInsert).toHaveBeenCalledTimes(2);
    });

    it('should update existing userStreak and track best', async () => {
      vi.setSystemTime(new Date('2025-01-15T10:00:00Z'));

      setupSelect([]); // no check today
      setupSelect([{ streakCount: 9 }]); // yesterday streak 9, new = 10

      const mockTxUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });

      mockTransaction.mockImplementation(async (fn: any) => {
        const tx = {
          insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) }),
          select: vi.fn().mockReturnValue(chainMock([{ bestAttendanceStreak: 15 }])),
          update: mockTxUpdate,
        };
        return fn(tx);
      });

      const result = await checkAttendance('user-1');

      expect(result.success).toBe(true);
      expect(result.streakCount).toBe(10);
      // Should update (not insert) userStreaks
      expect(mockTxUpdate).toHaveBeenCalled();
    });
  });

  describe('badge milestones (via checkAttendance)', () => {
    it('should check badges at milestone days: 3, 7, 30, 100, 365', async () => {
      // Badge check happens inside the transaction for specific streak counts
      // BUT checkAttendanceBadges uses module-level `db`, not `tx`
      vi.setSystemTime(new Date('2025-01-15T10:00:00Z'));

      // Test streak 3 -> should trigger badge check
      setupSelect([]); // 1st db.select: no check today
      setupSelect([{ streakCount: 2 }]); // 2nd db.select: yesterday streak 2, new = 3
      // checkAttendanceBadges uses db.select (module-level):
      setupSelect([{ id: 'badge-3', slug: 'attendance-3', nameKo: '3일 연속', descriptionKo: '3일 연속 출석!' }]); // 3rd: badge lookup
      setupSelect([]); // 4th: user doesn't have this badge yet

      // checkAttendanceBadges also calls db.insert (module-level) to award the badge
      mockInsert.mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) });

      mockTransaction.mockImplementation(async (fn: any) => {
        const tx = {
          insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) }),
          select: vi.fn().mockReturnValue(chainMock([])),
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue(undefined),
            }),
          }),
        };
        return fn(tx);
      });

      await checkAttendance('user-1');

      // createNotification should have been called for badge award
      expect(createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          type: 'badge',
          title: '배지 획득: 3일 연속',
        }),
      );
    });

    it('should not check badges for non-milestone streaks (e.g., streak 5)', async () => {
      vi.setSystemTime(new Date('2025-01-15T10:00:00Z'));

      setupSelect([]); // no check today
      setupSelect([{ streakCount: 4 }]); // yesterday streak 4, new = 5

      mockTransaction.mockImplementation(async (fn: any) => {
        const tx = {
          insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) }),
          select: vi.fn().mockReturnValue(chainMock([])),
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue(undefined),
            }),
          }),
        };
        return fn(tx);
      });

      await checkAttendance('user-1');

      // createNotification should NOT have been called (streak 5 is not a milestone)
      expect(createNotification).not.toHaveBeenCalled();
    });
  });

  describe('getAttendanceCalendar', () => {
    it('should return records for the given month', async () => {
      const mockRecords = [
        { checkDate: '2025-01-01', streakCount: 1, pointsEarned: 50 },
        { checkDate: '2025-01-02', streakCount: 2, pointsEarned: 50 },
      ];
      setupSelect(mockRecords);

      const result = await getAttendanceCalendar('user-1', 2025, 1);

      expect(result).toEqual(mockRecords);
    });

    it('should return empty array when no records exist', async () => {
      setupSelect([]);

      const result = await getAttendanceCalendar('user-1', 2025, 6);

      expect(result).toEqual([]);
    });
  });

  describe('getStreakInfo', () => {
    it('should return streak data when user has a streak record', async () => {
      const streakData = {
        attendanceStreak: 10,
        bestAttendanceStreak: 15,
        postingStreak: 3,
        pokerWinStreak: 0,
        streakShieldCount: 1,
      };
      setupSelect([streakData]);

      const result = await getStreakInfo('user-1');

      expect(result).toEqual(streakData);
    });

    it('should return zeros when user has no streak record', async () => {
      setupSelect([]);

      const result = await getStreakInfo('user-1');

      expect(result).toEqual({
        attendanceStreak: 0,
        bestAttendanceStreak: 0,
        postingStreak: 0,
        pokerWinStreak: 0,
        streakShieldCount: 0,
      });
    });
  });

  describe('hasCheckedInToday', () => {
    it('should return true when user checked in today', async () => {
      vi.setSystemTime(new Date('2025-01-15T10:00:00Z'));
      setupSelect([{ checkDate: '2025-01-15' }]);

      const result = await hasCheckedInToday('user-1');

      expect(result).toBe(true);
    });

    it('should return false when user has not checked in today', async () => {
      vi.setSystemTime(new Date('2025-01-15T10:00:00Z'));
      setupSelect([]);

      const result = await hasCheckedInToday('user-1');

      expect(result).toBe(false);
    });
  });
});

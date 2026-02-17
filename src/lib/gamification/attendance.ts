import { db } from '@/lib/db';
import { attendance, userStreaks, users } from '@/lib/db/schema';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import { awardPoints } from './points';
import { awardXp } from './xp';

interface CheckAttendanceResult {
  success: boolean;
  alreadyChecked: boolean;
  pointsEarned: number;
  xpEarned: number;
  streakCount: number;
  nextMilestone: {
    days: number;
    points: number;
  } | null;
}

/**
 * Check attendance for today (KST timezone)
 */
export async function checkAttendance(userId: string): Promise<CheckAttendanceResult> {
  if (!db) return { success: false, alreadyChecked: false, pointsEarned: 0, xpEarned: 0, streakCount: 0, nextMilestone: null };
  const today = getKstDate();
  const yesterday = getKstDate(new Date(Date.now() - 24 * 60 * 60 * 1000));

  // Check if already checked in today
  const existingCheck = await db
    .select()
    .from(attendance)
    .where(
      and(
        eq(attendance.userId, userId),
        eq(attendance.checkDate, today)
      )
    );

  if (existingCheck.length > 0) {
    return {
      success: false,
      alreadyChecked: true,
      pointsEarned: 0,
      xpEarned: 0,
      streakCount: existingCheck[0].streakCount,
      nextMilestone: getNextMilestone(existingCheck[0].streakCount),
    };
  }

  // Check if checked in yesterday
  const yesterdayCheck = await db
    .select()
    .from(attendance)
    .where(
      and(
        eq(attendance.userId, userId),
        eq(attendance.checkDate, yesterday)
      )
    );

  const hadYesterdayStreak = yesterdayCheck.length > 0;
  const newStreakCount = hadYesterdayStreak ? yesterdayCheck[0].streakCount + 1 : 1;

  // Calculate rewards based on streak
  const basePoints = 50;
  const baseXp = 10;
  const streakBonus = calculateStreakBonus(newStreakCount);
  const totalPoints = basePoints + streakBonus.points;
  const totalXp = baseXp + streakBonus.xp;

  return await db.transaction(async (tx: any) => {
    // Record attendance
    await tx.insert(attendance).values({
      userId,
      checkDate: today,
      streakCount: newStreakCount,
      pointsEarned: totalPoints,
      xpEarned: totalXp,
    });

    // Update user streaks
    const [existingStreak] = await tx
      .select()
      .from(userStreaks)
      .where(eq(userStreaks.userId, userId));

    if (existingStreak) {
      await tx
        .update(userStreaks)
        .set({
          attendanceStreak: newStreakCount,
          bestAttendanceStreak: Math.max(
            existingStreak.bestAttendanceStreak,
            newStreakCount
          ),
          updatedAt: new Date(),
        })
        .where(eq(userStreaks.userId, userId));
    } else {
      await tx.insert(userStreaks).values({
        userId,
        attendanceStreak: newStreakCount,
        bestAttendanceStreak: newStreakCount,
      });
    }

    // Award points
    await awardPoints(
      userId,
      totalPoints,
      'earn_attendance',
      undefined,
      `출석 체크 (${newStreakCount}일 연속)`
    );

    // Award XP
    await awardXp(userId, totalXp, 'attendance');

    // Check for attendance badges
    await checkAttendanceBadges(userId, newStreakCount);

    return {
      success: true,
      alreadyChecked: false,
      pointsEarned: totalPoints,
      xpEarned: totalXp,
      streakCount: newStreakCount,
      nextMilestone: getNextMilestone(newStreakCount),
    };
  });
}

/**
 * Calculate streak bonus
 */
function calculateStreakBonus(streakCount: number): { points: number; xp: number } {
  if (streakCount >= 30) {
    return { points: 200, xp: 50 };
  } else if (streakCount >= 14) {
    return { points: 150, xp: 30 };
  } else if (streakCount >= 7) {
    return { points: 100, xp: 20 };
  } else if (streakCount >= 3) {
    return { points: 75, xp: 15 };
  }
  return { points: 0, xp: 0 };
}

/**
 * Get next milestone
 */
function getNextMilestone(currentStreak: number): { days: number; points: number } | null {
  const milestones = [
    { days: 3, points: 75 },
    { days: 7, points: 100 },
    { days: 14, points: 150 },
    { days: 30, points: 200 },
  ];

  for (const milestone of milestones) {
    if (currentStreak < milestone.days) {
      return milestone;
    }
  }

  return null; // Max milestone reached
}

/**
 * Check and award attendance badges
 */
async function checkAttendanceBadges(userId: string, streakCount: number) {
  // Badge logic will be implemented when badge system is ready
  // For now, this is a placeholder
  const badgeMilestones = [3, 7, 30, 100, 365];

  // TODO: Award badges at milestones
  if (badgeMilestones.includes(streakCount)) {
    // Award badge
  }
}

/**
 * Get attendance calendar for a specific month
 */
export async function getAttendanceCalendar(
  userId: string,
  year: number,
  month: number // 1-12
) {
  if (!db) return [];
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = new Date(year, month, 0).toISOString().split('T')[0]; // Last day of month

  const records = await db
    .select()
    .from(attendance)
    .where(
      and(
        eq(attendance.userId, userId),
        gte(attendance.checkDate, startDate),
        lte(attendance.checkDate, endDate)
      )
    )
    .orderBy(attendance.checkDate);

  return records;
}

/**
 * Get streak info for a user
 */
export async function getStreakInfo(userId: string) {
  if (!db) return { attendanceStreak: 0, bestAttendanceStreak: 0, postingStreak: 0, pokerWinStreak: 0, streakShieldCount: 0 };
  const [streak] = await db
    .select()
    .from(userStreaks)
    .where(eq(userStreaks.userId, userId));

  if (!streak) {
    return {
      attendanceStreak: 0,
      bestAttendanceStreak: 0,
      postingStreak: 0,
      pokerWinStreak: 0,
      streakShieldCount: 0,
    };
  }

  return streak;
}

/**
 * Get current KST date as YYYY-MM-DD string
 */
function getKstDate(date: Date = new Date()): string {
  // Convert to KST (UTC+9)
  const kstDate = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return kstDate.toISOString().split('T')[0];
}

/**
 * Check if user has checked in today
 */
export async function hasCheckedInToday(userId: string): Promise<boolean> {
  if (!db) return false;
  const today = getKstDate();

  const [check] = await db
    .select()
    .from(attendance)
    .where(
      and(
        eq(attendance.userId, userId),
        eq(attendance.checkDate, today)
      )
    );

  return !!check;
}

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '출석체크 | Open Poker',
  description: '매일 출석체크하고 포인트를 획득하세요.',
};

import { AttendanceCalendar, type AttendanceDay } from '@/components/gamification/AttendanceCalendar';
import { getSession } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { getAttendanceCalendar, getStreakInfo, hasCheckedInToday } from '@/lib/gamification/attendance';
import { AttendanceCheckInClient } from './AttendanceCheckInClient';

export default async function AttendancePage() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  // Fetch attendance data
  const records = await getAttendanceCalendar(session.userId, year, month);
  const streak = await getStreakInfo(session.userId);
  const isCheckedToday = await hasCheckedInToday(session.userId);

  // Generate calendar days
  const days = generateCalendarDays(year, month, records);

  // Calculate next milestone
  const nextMilestone = getNextMilestone(streak.attendanceStreak);

  return (
    <AttendanceCheckInClient
      year={year}
      month={month}
      days={days}
      streak={streak}
      isCheckedToday={isCheckedToday}
      nextMilestone={nextMilestone}
    />
  );
}

function generateCalendarDays(
  year: number,
  month: number,
  records: { checkDate: string }[]
): AttendanceDay[] {
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const daysInMonth = lastDay.getDate();
  const startDayOfWeek = firstDay.getDay();

  const days: AttendanceDay[] = [];
  const today = new Date();
  const recordDates = new Set(records.map((r) => r.checkDate));

  // Add empty cells for days before the first day of the month
  for (let i = 0; i < startDayOfWeek; i++) {
    const emptyDate = new Date(year, month - 1, -startDayOfWeek + i + 1);
    days.push({
      date: emptyDate,
      isChecked: false,
      isToday: false,
      isFuture: false,
    });
  }

  // Add all days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const isToday =
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate();
    const isFuture = date > today;

    days.push({
      date,
      isChecked: recordDates.has(dateStr),
      isToday,
      isFuture,
    });
  }

  return days;
}

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

  return null;
}

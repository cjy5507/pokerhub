'use client';

import { AttendanceCalendar, type AttendanceDay } from '@/components/gamification/AttendanceCalendar';
import { checkAttendanceAction } from '../actions';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

interface AttendanceCheckInClientProps {
  year: number;
  month: number;
  days: AttendanceDay[];
  streak: {
    attendanceStreak: number;
    bestAttendanceStreak: number;
  };
  isCheckedToday: boolean;
  nextMilestone: { days: number; points: number } | null;
}

export function AttendanceCheckInClient({
  year,
  month,
  days,
  streak,
  isCheckedToday,
  nextMilestone,
}: AttendanceCheckInClientProps) {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(false);

  const handleCheckIn = async () => {
    if (isCheckedToday || isChecking) return;

    setIsChecking(true);
    try {
      const result = await checkAttendanceAction();

      if (result.success && result.data) {
        toast.success(
          `출석 완료! +${result.data.pointsEarned}포인트, +${result.data.xpEarned}XP`,
          {
            description: `${result.data.streakCount}일 연속 출석 중`,
          }
        );
        router.refresh();
      } else {
        toast.error(result.error || '출석 체크에 실패했습니다');
      }
    } catch (error) {
      toast.error('출석 체크 중 오류가 발생했습니다');
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="container max-w-2xl mx-auto px-4 py-6 lg:py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-[#e0e0e0] mb-2">
          출석 체크
        </h1>
        <p className="text-sm text-[#a0a0a0]">
          매일 출석하고 보상을 받아가세요
        </p>
      </div>

      {/* Streak Info */}
      {streak.attendanceStreak > 0 && (
        <div className="bg-[#1e1e1e] rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-[#a0a0a0] mb-1">현재 연속 출석</div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-[#c9a227]">
                  {streak.attendanceStreak}일
                </span>
              </div>
            </div>
            {nextMilestone && (
              <div className="text-right">
                <div className="text-sm text-[#a0a0a0] mb-1">다음 목표</div>
                <div className="text-sm font-semibold text-[#e0e0e0]">
                  {nextMilestone.days}일 연속
                </div>
                <div className="text-xs text-[#c9a227] font-bold">
                  +{nextMilestone.points}포인트
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Best Streak */}
      {streak.bestAttendanceStreak > 0 && (
        <div className="bg-[#1e1e1e] rounded-lg p-3 mb-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-[#a0a0a0]">최고 기록</div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#d4af37]">
                {streak.bestAttendanceStreak}일 연속
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Calendar */}
      <AttendanceCalendar
        year={year}
        month={month}
        days={days}
        currentStreak={streak.attendanceStreak}
        onCheckIn={handleCheckIn}
        isCheckedToday={isCheckedToday}
      />

      {/* Rewards Info */}
      <div className="mt-6 bg-[#1e1e1e] rounded-lg p-4">
        <h3 className="text-sm font-bold text-[#e0e0e0] mb-3">출석 보상</h3>
        <div className="space-y-2 text-xs lg:text-sm">
          <div className="flex items-center justify-between py-2 border-b border-[#333]">
            <span className="text-[#a0a0a0]">기본 출석</span>
            <span className="font-semibold text-[#c9a227]">+50포인트</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-[#333]">
            <span className="text-[#a0a0a0]">3일 연속</span>
            <span className="font-semibold text-[#c9a227]">+75포인트</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-[#333]">
            <span className="text-[#a0a0a0]">7일 연속</span>
            <span className="font-semibold text-[#c9a227]">+100포인트</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-[#333]">
            <span className="text-[#a0a0a0]">14일 연속</span>
            <span className="font-semibold text-[#c9a227]">+150포인트</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-[#a0a0a0]">30일 연속</span>
            <span className="font-semibold text-[#c9a227]">+200포인트</span>
          </div>
        </div>
      </div>
    </div>
  );
}

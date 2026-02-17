'use client';

import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import { useState } from 'react';

export interface AttendanceDay {
  date: Date;
  isChecked: boolean;
  isToday: boolean;
  isFuture: boolean;
  isInStreak?: boolean;
}

export interface AttendanceCalendarProps {
  year: number;
  month: number;
  days: AttendanceDay[];
  currentStreak: number;
  onCheckIn?: () => void;
  isCheckedToday?: boolean;
  className?: string;
}

const weekDays = ['일', '월', '화', '수', '목', '금', '토'];

export function AttendanceCalendar({
  year,
  month,
  days,
  currentStreak,
  onCheckIn,
  isCheckedToday = false,
  className
}: AttendanceCalendarProps) {
  const [isChecking, setIsChecking] = useState(false);

  const handleCheckIn = async () => {
    if (isCheckedToday || isChecking) return;

    setIsChecking(true);
    try {
      await onCheckIn?.();
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className={cn('bg-[#1e1e1e] rounded-lg p-4 lg:p-6', className)}>
      {/* Calendar header */}
      <div className="mb-4">
        <h3 className="text-lg lg:text-xl font-bold text-[#e0e0e0]">
          {year}년 {month}월
        </h3>
      </div>

      {/* Week day labels */}
      <div className="grid grid-cols-7 gap-1 lg:gap-2 mb-2">
        {weekDays.map((day) => (
          <div
            key={day}
            className="text-center text-xs lg:text-sm text-[#888] font-medium py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1 lg:gap-2 mb-4">
        {days.map((day, index) => (
          <div
            key={index}
            className={cn(
              'aspect-square flex items-center justify-center rounded text-sm lg:text-base relative',
              'transition-all duration-200',
              day.isFuture && 'bg-[#0d0d0d] text-[#333] cursor-not-allowed',
              !day.isFuture && !day.isChecked && 'bg-[#2a2a2a] text-[#a0a0a0]',
              day.isChecked && !day.isToday && 'bg-[#c9a227] text-black font-semibold',
              day.isToday && !day.isChecked && 'border-2 border-[#c9a227] text-[#e0e0e0]',
              day.isToday && day.isChecked && 'bg-[#c9a227] text-black font-bold',
              day.isInStreak && !day.isChecked && 'ring-1 ring-[#ef4444]/50'
            )}
            style={
              day.isToday && !isCheckedToday
                ? { animation: 'pulse-gold 2s infinite' }
                : undefined
            }
          >
            <span>{day.date.getDate()}</span>
            {day.isChecked && (
              <Check className="absolute w-3 h-3 lg:w-4 lg:h-4 top-0.5 right-0.5" />
            )}
            {day.isInStreak && !day.isChecked && (
              <div className="absolute bottom-0.5 w-1 h-1 rounded-full bg-[#ef4444]" />
            )}
          </div>
        ))}
      </div>

      {/* Streak indicator */}
      {currentStreak > 0 && (
        <div className="flex items-center justify-center gap-2 mb-4 py-3">
          <div className="text-center">
            <div className="text-2xl font-bold text-[#c9a227]">
              {currentStreak}
            </div>
            <div className="text-xs text-[#a0a0a0]">일 연속</div>
          </div>
        </div>
      )}

      {/* Check-in button */}
      <button
        onClick={handleCheckIn}
        disabled={isCheckedToday || isChecking}
        className={cn(
          'w-full py-3 lg:py-4 rounded-lg font-bold text-base lg:text-lg',
          'transition-all duration-200 min-h-[48px] touch-manipulation',
          !isCheckedToday && 'bg-[#c9a227] text-black',
          !isCheckedToday && 'hover:bg-[#d4af37] active:scale-98',
          !isCheckedToday && 'shadow-[0_4px_12px_rgba(201,162,39,0.3)]',
          isCheckedToday && 'bg-[#22c55e]/20 text-[#22c55e] border border-[#22c55e]/30',
          isCheckedToday && 'cursor-not-allowed'
        )}
        aria-label={isCheckedToday ? '출석 완료' : '출석 체크'}
      >
        {isChecking ? (
          <span className="flex items-center justify-center gap-2">
            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            체크 중...
          </span>
        ) : isCheckedToday ? (
          <span className="flex items-center justify-center gap-2">
            <Check className="w-5 h-5" />
            출석 완료
          </span>
        ) : (
          '출석 체크'
        )}
      </button>
    </div>
  );
}

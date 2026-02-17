'use client';

import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface MissionCardProps {
  id: string;
  title: string;
  description?: string;
  icon: LucideIcon;
  current: number;
  target: number;
  reward: number;
  status: 'active' | 'completed' | 'claimed';
  onClaim?: (id: string) => void;
  isDailyBonus?: boolean;
  className?: string;
}

export function MissionCard({
  id,
  title,
  description,
  icon: Icon,
  current,
  target,
  reward,
  status,
  onClaim,
  isDailyBonus = false,
  className
}: MissionCardProps) {
  const progress = Math.min((current / target) * 100, 100);
  const isCompleted = status === 'completed';
  const isClaimed = status === 'claimed';

  const handleClaim = () => {
    if (isCompleted && !isClaimed && onClaim) {
      onClaim(id);
    }
  };

  return (
    <div
      className={cn(
        'bg-[#1e1e1e] rounded-lg p-4 transition-all duration-200',
        isDailyBonus && isCompleted && 'border-2 border-[#c9a227] shadow-[0_0_12px_rgba(201,162,39,0.3)]',
        isClaimed && 'opacity-60',
        className
      )}
    >
      <div className="flex items-start gap-3 mb-3">
        {/* Icon */}
        <div className={cn(
          'flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center',
          isCompleted && !isClaimed ? 'bg-[#c9a227]/20' : 'bg-[#2a2a2a]'
        )}>
          <Icon
            className={cn(
              'w-5 h-5',
              isCompleted && !isClaimed ? 'text-[#c9a227]' : 'text-[#a0a0a0]'
            )}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm lg:text-base font-semibold text-[#e0e0e0] mb-1">
            {title}
          </h4>
          {description && (
            <p className="text-xs text-[#a0a0a0] mb-2">{description}</p>
          )}

          {/* Progress bar */}
          <div className="mb-2">
            <div className="h-1 bg-[#333] rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full transition-all duration-500 rounded-full',
                  isCompleted ? 'bg-[#c9a227]' : 'bg-[#c9a227]/50'
                )}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Progress text */}
          <div className="flex items-center justify-between text-xs">
            <span className={cn(
              'font-medium',
              isCompleted ? 'text-[#c9a227]' : 'text-[#a0a0a0]'
            )}>
              {current}/{target} 완료
            </span>
            <span className="text-[#c9a227] font-bold">+{reward}P</span>
          </div>
        </div>

        {/* Reward badge */}
        <div className={cn(
          'flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-bold',
          isCompleted && !isClaimed && 'bg-[#c9a227] text-black',
          !isCompleted && 'bg-[#2a2a2a] text-[#a0a0a0]',
          isClaimed && 'bg-[#22c55e]/20 text-[#22c55e]'
        )}>
          {isClaimed ? '완료' : `${reward}P`}
        </div>
      </div>

      {/* Claim button */}
      {isCompleted && !isClaimed && (
        <button
          onClick={handleClaim}
          className={cn(
            'w-full py-2.5 rounded-lg font-bold text-sm',
            'bg-[#c9a227] text-black',
            'hover:bg-[#d4af37]',
            'transition-all duration-200 active:scale-98',
            'min-h-[44px] touch-manipulation'
          )}
        >
          보상 받기
        </button>
      )}

      {/* Completed overlay */}
      {isClaimed && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#1e1e1e]/80 rounded-lg">
          <div className="flex items-center gap-2 text-[#22c55e]">
            <Check className="w-6 h-6" />
            <span className="font-bold">완료</span>
          </div>
        </div>
      )}
    </div>
  );
}

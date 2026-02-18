'use client';

import { cn } from '@/lib/utils';
import Link from 'next/link';

export type UserLevel = number;

export interface AuthorBadgeProps {
  userId: string;
  nickname: string;
  level: UserLevel;
  compact?: boolean;
  asSpan?: boolean;
  className?: string;
}

function getLevelTier(level: number): {
  name: string;
  bgClass: string;
  textClass: string;
} {
  if (level < 10) {
    return {
      name: 'Bronze',
      bgClass: 'bg-amber-900/30',
      textClass: 'text-amber-600',
    };
  }
  if (level < 25) {
    return {
      name: 'Silver',
      bgClass: 'bg-gray-400/20',
      textClass: 'text-gray-300',
    };
  }
  if (level < 50) {
    return {
      name: 'Gold',
      bgClass: 'bg-yellow-500/20',
      textClass: 'text-yellow-400',
    };
  }
  if (level < 100) {
    return {
      name: 'Platinum',
      bgClass: 'bg-slate-300/20',
      textClass: 'text-slate-200',
    };
  }
  return {
    name: 'Diamond',
    bgClass: 'bg-cyan-300/20',
    textClass: 'text-cyan-200',
  };
}

export function AuthorBadge({
  userId,
  nickname,
  level,
  compact = false,
  asSpan = false,
  className
}: AuthorBadgeProps) {
  const tier = getLevelTier(level);

  const content = (
    <>
      {/* Level badge */}
      <div
        className={cn(
          'px-1.5 py-0.5 rounded text-xs font-bold',
          tier.bgClass,
          tier.textClass,
          compact ? 'h-4 text-[10px]' : 'h-5'
        )}
      >
        Lv.{level}
      </div>

      {/* Nickname */}
      <span className={cn(
        'font-medium text-op-text',
        compact ? 'text-xs' : 'text-sm'
      )}>
        {nickname}
      </span>
    </>
  );

  if (asSpan) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5',
          className
        )}
      >
        {content}
      </span>
    );
  }

  return (
    <Link
      href={`/profile/${userId}`}
      className={cn(
        'inline-flex items-center gap-1.5 hover:opacity-80 transition-opacity',
        className
      )}
    >
      {content}
    </Link>
  );
}

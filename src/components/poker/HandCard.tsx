'use client';

import { cn } from '@/lib/utils';
import { InlineCards } from './CardRenderer';
import { AuthorBadge } from '../user/AuthorBadge';
import { Heart, MessageSquare, Eye } from 'lucide-react';
import Link from 'next/link';

export interface HandCardProps {
  handId: string;
  heroCards: string; // e.g., "Ah Kd"
  boardCards?: string; // e.g., "Qs Jc Ts 7h 2d"
  stakes: string; // e.g., "1/2"
  heroPosition: string;
  result: 'won' | 'lost' | 'split';
  winAmount?: number;
  author: {
    userId: string;
    nickname: string;
    level: number;
  };
  likes: number;
  comments: number;
  createdAt: Date;
  isLiked?: boolean;
  className?: string;
}

export function HandCard({
  handId,
  heroCards,
  boardCards,
  stakes,
  heroPosition,
  result,
  winAmount,
  author,
  likes,
  comments,
  createdAt,
  isLiked = false,
  className
}: HandCardProps) {
  const timeAgo = getTimeAgo(createdAt);

  return (
    <Link
      href={`/hands/${handId}`}
      className={cn(
        'block bg-op-surface rounded p-4 lg:p-5 hover:bg-op-elevated transition-colors',
        'border-l-2',
        result === 'won' ? 'border-op-gold' : 'border-transparent',
        className
      )}
    >
      {/* Cards */}
      <div className="flex items-center gap-3 mb-3">
        {/* Hero cards */}
        <InlineCards notation={heroCards} size="md" />

        {/* Board cards */}
        {boardCards && (
          <>
            <div className="text-op-text-muted text-lg mx-1">vs</div>
            <InlineCards notation={boardCards} size="sm" />
          </>
        )}
      </div>

      {/* Badges */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {/* Stakes badge */}
        <span className="px-2.5 py-1 text-xs font-semibold bg-op-elevated text-op-text-secondary rounded-full">
          {stakes}
        </span>

        {/* Position badge */}
        <span className="px-2.5 py-1 text-xs font-semibold bg-op-felt/30 text-op-felt border border-op-felt/30 rounded-full">
          {heroPosition}
        </span>

        {/* Result badge */}
        <span className={cn(
          'px-2.5 py-1 text-xs font-bold rounded-full',
          result === 'won'
            ? 'bg-op-success/20 text-op-success border border-op-success/30'
            : result === 'lost'
            ? 'bg-op-error/20 text-op-error border border-op-error/30'
            : 'bg-op-warning/20 text-op-warning border border-op-warning/30'
        )}>
          {result === 'won' ? `+$${winAmount?.toLocaleString() || 0}` : result === 'lost' ? '패배' : '스플릿'}
        </span>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        {/* Author and time */}
        <div className="flex items-center gap-2 text-sm">
          <AuthorBadge
            userId={author.userId}
            nickname={author.nickname}
            level={author.level}
          />
          <span className="text-op-text-muted">·</span>
          <span className="text-op-text-muted">{timeAgo}</span>
        </div>

        {/* Engagement stats */}
        <div className="flex items-center gap-4 text-sm text-op-text-secondary">
          <div className="flex items-center gap-1">
            <Eye className="w-4 h-4" />
            <span>{formatNumber(likes * 10)}</span>
          </div>
          <div className={cn(
            'flex items-center gap-1',
            isLiked && 'text-op-error'
          )}>
            <Heart className={cn('w-4 h-4', isLiked && 'fill-current')} />
            <span>{formatNumber(likes)}</span>
          </div>
          <div className="flex items-center gap-1">
            <MessageSquare className="w-4 h-4" />
            <span>{formatNumber(comments)}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return '방금 전';
  if (diffMins < 60) return `${diffMins}분 전`;
  if (diffHours < 24) return `${diffHours}시간 전`;
  if (diffDays < 7) return `${diffDays}일 전`;

  return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

function formatNumber(num: number): string {
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}k`;
  }
  return num.toString();
}

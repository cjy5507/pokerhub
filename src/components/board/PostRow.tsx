'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { AuthorBadge } from '../user/AuthorBadge';
import { Eye, Heart, MessageSquare, Pin } from 'lucide-react';
import Link from 'next/link';

export interface PostRowProps {
  postId: string;
  boardSlug: string;
  title: string;
  author: {
    userId: string;
    nickname: string;
    level: number;
  };
  createdAt: Date;
  views: number;
  likes: number;
  commentCount: number;
  isPinned?: boolean;
  isVisited?: boolean;
  className?: string;
}

function PostRowBase({
  postId,
  boardSlug,
  title,
  author,
  createdAt,
  views,
  likes,
  commentCount,
  isPinned = false,
  isVisited = false,
  className
}: PostRowProps) {
  const timeAgo = getTimeAgo(createdAt);

  return (
    <Link
      href={`/board/${boardSlug}/${postId}`}
      className={cn(
        // Mobile: card layout (default)
        'block bg-op-surface rounded-lg p-3 md:p-4 hover:bg-op-elevated transition-colors',
        // Desktop: table row layout
        'lg:bg-transparent lg:rounded-none lg:p-0 lg:px-4 lg:py-2 lg:border-b lg:border-op-border',
        className
      )}
    >
      {/* Desktop: table row layout */}
      <div className="hidden lg:grid lg:grid-cols-[auto_1fr_150px_100px_80px_80px] gap-4 items-center">
        {/* Pinned icon */}
        <div className="w-6 flex items-center justify-center">
          {isPinned && <Pin className="w-4 h-4 text-op-gold" />}
        </div>

        {/* Title + comment count */}
        <div className="min-w-0">
          <h3 className={cn(
            'text-[13px] font-medium truncate',
            isVisited ? 'text-op-text-muted' : 'text-op-text'
          )}>
            {title}
            {commentCount > 0 && (
              <span className="text-op-gold text-xs ml-1 font-medium">[{commentCount}]</span>
            )}
          </h3>
        </div>

        {/* Author */}
        <div>
          <AuthorBadge
            userId={author.userId}
            nickname={author.nickname}
            level={author.level}
            asSpan
          />
        </div>

        {/* Date */}
        <div className="text-xs text-op-text-muted">{timeAgo}</div>

        {/* Views */}
        <div className="flex items-center gap-1 text-xs text-op-text-muted">
          <Eye className="w-3.5 h-3.5" />
          <span>{formatNumber(views)}</span>
        </div>

        {/* Likes */}
        <div className="flex items-center gap-1 text-xs text-op-text-muted">
          <Heart className="w-3.5 h-3.5" />
          <span>{formatNumber(likes)}</span>
        </div>
      </div>

      {/* Mobile: card layout */}
      <div className="lg:hidden">
        {/* Title */}
        <div className="flex items-start gap-2 mb-2">
          {isPinned && (
            <Pin className="w-4 h-4 text-op-gold flex-shrink-0 mt-0.5" />
          )}
          <h3 className={cn(
            'font-semibold text-sm sm:text-base line-clamp-2 leading-snug',
            isVisited ? 'text-op-text-muted' : 'text-op-text'
          )}>
            {title}
            {commentCount > 0 && (
              <span className="ml-1.5 text-xs font-bold text-op-gold">
                [{commentCount}]
              </span>
            )}
          </h3>
        </div>

        {/* Author and date */}
        <div className="flex items-center gap-2 text-xs sm:text-sm mb-1.5 sm:mb-2">
          <AuthorBadge
            userId={author.userId}
            nickname={author.nickname}
            level={author.level}
            compact
            asSpan
          />
          <span className="text-op-text-muted">·</span>
          <span className="text-op-text-muted">{timeAgo}</span>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm text-op-text-muted">
          <div className="flex items-center gap-1">
            <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>{formatNumber(views)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Heart className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>{formatNumber(likes)}</span>
          </div>
          <div className="flex items-center gap-1">
            <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>{formatNumber(commentCount)}</span>
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

export const PostRow = React.memo(PostRowBase);

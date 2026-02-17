'use client';

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

export function PostRow({
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
    <>
      {/* Desktop: Table row layout */}
      <Link
        href={`/board/${boardSlug}/${postId}`}
        className={cn(
          'hidden lg:grid lg:grid-cols-[auto_1fr_150px_100px_80px_80px] gap-4 items-center',
          'px-4 py-3 border-b border-[#333] hover:bg-[#2a2a2a] transition-colors',
          className
        )}
      >
        {/* Pinned icon */}
        <div className="w-6 flex items-center justify-center">
          {isPinned && <Pin className="w-4 h-4 text-[#c9a227]" />}
        </div>

        {/* Title + comment count */}
        <div className="flex items-center gap-2 min-w-0">
          <h3 className={cn(
            'font-medium truncate',
            isVisited ? 'text-[#888]' : 'text-[#e0e0e0]'
          )}>
            {title}
          </h3>
          {commentCount > 0 && (
            <span className="flex-shrink-0 text-xs font-bold text-[#3b82f6]">
              [{commentCount}]
            </span>
          )}
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
        <div className="text-sm text-[#a0a0a0]">{timeAgo}</div>

        {/* Views */}
        <div className="flex items-center gap-1 text-sm text-[#a0a0a0]">
          <Eye className="w-4 h-4" />
          <span>{formatNumber(views)}</span>
        </div>

        {/* Likes */}
        <div className="flex items-center gap-1 text-sm text-[#a0a0a0]">
          <Heart className="w-4 h-4" />
          <span>{formatNumber(likes)}</span>
        </div>
      </Link>

      {/* Mobile: Card layout */}
      <Link
        href={`/board/${boardSlug}/${postId}`}
        className={cn(
          'block lg:hidden bg-[#1e1e1e] rounded-lg p-4 hover:bg-[#2a2a2a] transition-colors',
          className
        )}
      >
        {/* Title */}
        <div className="flex items-start gap-2 mb-2">
          {isPinned && (
            <Pin className="w-4 h-4 text-[#c9a227] flex-shrink-0 mt-0.5" />
          )}
          <h3 className={cn(
            'font-semibold text-base line-clamp-2',
            isVisited ? 'text-[#888]' : 'text-[#e0e0e0]'
          )}>
            {title}
            {commentCount > 0 && (
              <span className="ml-1.5 text-xs font-bold text-[#3b82f6]">
                [{commentCount}]
              </span>
            )}
          </h3>
        </div>

        {/* Author and date */}
        <div className="flex items-center gap-2 text-sm mb-2">
          <AuthorBadge
            userId={author.userId}
            nickname={author.nickname}
            level={author.level}
            compact
            asSpan
          />
          <span className="text-[#888]">·</span>
          <span className="text-[#888]">{timeAgo}</span>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm text-[#a0a0a0]">
          <div className="flex items-center gap-1">
            <Eye className="w-4 h-4" />
            <span>{formatNumber(views)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Heart className="w-4 h-4" />
            <span>{formatNumber(likes)}</span>
          </div>
          <div className="flex items-center gap-1">
            <MessageSquare className="w-4 h-4" />
            <span>{formatNumber(commentCount)}</span>
          </div>
        </div>
      </Link>
    </>
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

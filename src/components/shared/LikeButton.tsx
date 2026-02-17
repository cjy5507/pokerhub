'use client';

import { cn } from '@/lib/utils';
import { Heart } from 'lucide-react';
import { useState, useCallback } from 'react';

export interface LikeButtonProps {
  targetId: string;
  targetType: 'post' | 'hand' | 'comment';
  initialLikes: number;
  initialIsLiked?: boolean;
  onLikeChange?: (isLiked: boolean, newCount: number) => void;
  showCount?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LikeButton({
  targetId,
  targetType,
  initialLikes,
  initialIsLiked = false,
  onLikeChange,
  showCount = true,
  size = 'md',
  className
}: LikeButtonProps) {
  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [likes, setLikes] = useState(initialLikes);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const handleLike = useCallback(async () => {
    if (isPending) return;

    // Optimistic update
    const newIsLiked = !isLiked;
    const newLikes = newIsLiked ? likes + 1 : likes - 1;

    setIsLiked(newIsLiked);
    setLikes(newLikes);
    setIsPending(true);

    // Trigger animation
    if (newIsLiked) {
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 300);
    }

    try {
      // TODO: API call
      // const response = await fetch('/api/likes', {
      //   method: 'POST',
      //   body: JSON.stringify({ targetId, targetType, isLiked: newIsLiked })
      // });
      // if (!response.ok) throw new Error();

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 300));

      onLikeChange?.(newIsLiked, newLikes);
    } catch (error) {
      // Rollback on error
      setIsLiked(!newIsLiked);
      setLikes(likes);
      console.error('Failed to update like:', error);
    } finally {
      setIsPending(false);
    }
  }, [isLiked, likes, targetId, targetType, onLikeChange, isPending]);

  const sizeClasses = {
    sm: 'gap-1 text-xs',
    md: 'gap-1.5 text-sm',
    lg: 'gap-2 text-base',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  return (
    <button
      onClick={handleLike}
      disabled={isPending}
      className={cn(
        'inline-flex items-center transition-all duration-200',
        'min-h-[44px] min-w-[44px] touch-manipulation',
        'hover:scale-105 active:scale-95',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        sizeClasses[size],
        className
      )}
      aria-label={isLiked ? '좋아요 취소' : '좋아요'}
      aria-pressed={isLiked}
    >
      <Heart
        className={cn(
          iconSizes[size],
          'transition-colors duration-200',
          isLiked ? 'fill-[#ef4444] text-[#ef4444]' : 'text-[#a0a0a0]',
          isAnimating && 'animate-[likePop_300ms_ease-out]'
        )}
      />
      {showCount && (
        <span className={cn(
          'font-medium tabular-nums',
          isLiked ? 'text-[#ef4444]' : 'text-[#a0a0a0]'
        )}>
          {formatNumber(likes)}
        </span>
      )}
    </button>
  );
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}

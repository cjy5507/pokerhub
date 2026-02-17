'use client';

import { useState, useTransition } from 'react';
import { Heart, Bookmark, Share2, Flag, Trash2, Edit } from 'lucide-react';
import { togglePostLike, toggleBookmark, reportPost, deletePost } from '@/app/(boards)/actions';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface PostActionsProps {
  postId: string;
  boardSlug: string;
  initialLikes: number;
  initialIsLiked: boolean;
  initialIsBookmarked: boolean;
  isOwner: boolean;
}

export function PostActions({
  postId,
  boardSlug,
  initialLikes,
  initialIsLiked,
  initialIsBookmarked,
  isOwner,
}: PostActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [likeCount, setLikeCount] = useState(initialLikes);
  const [isBookmarked, setIsBookmarked] = useState(initialIsBookmarked);

  const handleLike = () => {
    // Optimistic update
    const newLiked = !isLiked;
    const newCount = newLiked ? likeCount + 1 : likeCount - 1;
    setIsLiked(newLiked);
    setLikeCount(newCount);

    startTransition(async () => {
      const result = await togglePostLike({ postId });
      if (!result.success) {
        // Rollback on error
        setIsLiked(!newLiked);
        setLikeCount(likeCount);
        toast.error(result.error || '좋아요 처리 중 오류가 발생했습니다');
      }
    });
  };

  const handleBookmark = () => {
    // Optimistic update
    const newBookmarked = !isBookmarked;
    setIsBookmarked(newBookmarked);

    startTransition(async () => {
      const result = await toggleBookmark({ postId });
      if (result.success) {
        toast.success(newBookmarked ? '북마크에 추가되었습니다' : '북마크가 해제되었습니다');
      } else {
        // Rollback on error
        setIsBookmarked(!newBookmarked);
        toast.error(result.error || '북마크 처리 중 오류가 발생했습니다');
      }
    });
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('링크가 복사되었습니다');
    } catch (error) {
      toast.error('링크 복사에 실패했습니다');
    }
  };

  const handleReport = () => {
    const confirmed = window.confirm('이 게시글을 신고하시겠습니까?');
    if (!confirmed) return;

    const reason = window.prompt('신고 사유를 입력해주세요 (최소 10자):');
    if (!reason || reason.length < 10) {
      toast.error('신고 사유는 최소 10자 이상 입력해주세요');
      return;
    }

    startTransition(async () => {
      const result = await reportPost({ postId, reason });
      if (result.success) {
        toast.success('신고가 접수되었습니다');
      } else {
        toast.error(result.error || '신고 처리 중 오류가 발생했습니다');
      }
    });
  };

  const handleDelete = () => {
    const confirmed = window.confirm('정말 삭제하시겠습니까?');
    if (!confirmed) return;

    startTransition(async () => {
      const result = await deletePost({ postId });
      if (result.success) {
        toast.success('게시글이 삭제되었습니다');
        router.push(`/board/${boardSlug}`);
      } else {
        toast.error(result.error || '삭제 중 오류가 발생했습니다');
      }
    });
  };

  return (
    <div className="p-4 flex items-center gap-3 flex-wrap">
      {/* Like button */}
      <button
        onClick={handleLike}
        disabled={isPending}
        className={cn(
          'flex items-center gap-1.5 text-sm transition-all duration-200',
          'min-h-[44px] px-3 disabled:opacity-50',
          'hover:scale-105 active:scale-95',
          isLiked ? 'text-[#ef4444]' : 'text-[#a0a0a0] hover:text-[#e0e0e0]'
        )}
      >
        <Heart className={cn('w-5 h-5', isLiked && 'fill-current')} />
        <span className="font-medium">{likeCount}</span>
      </button>

      {/* Bookmark */}
      <button
        onClick={handleBookmark}
        disabled={isPending}
        className={cn(
          'flex items-center gap-1.5 text-sm transition-colors',
          'min-h-[44px] px-3 disabled:opacity-50',
          isBookmarked ? 'text-[#c9a227]' : 'text-[#a0a0a0] hover:text-[#e0e0e0]'
        )}
        aria-label={isBookmarked ? '북마크 취소' : '북마크'}
      >
        <Bookmark className={cn('w-5 h-5', isBookmarked && 'fill-current')} />
      </button>

      {/* Share */}
      <button
        onClick={handleShare}
        className="flex items-center gap-1.5 text-sm text-[#a0a0a0] hover:text-[#e0e0e0] transition-colors min-h-[44px] px-3"
        aria-label="공유"
      >
        <Share2 className="w-5 h-5" />
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Owner actions */}
      {isOwner && (
        <>
          <button
            onClick={() => router.push(`/board/${boardSlug}/write?edit=${postId}`)}
            className="flex items-center gap-1.5 text-sm text-[#a0a0a0] hover:text-[#3b82f6] transition-colors min-h-[44px] px-3"
          >
            <Edit className="w-5 h-5" />
            <span className="hidden sm:inline">수정</span>
          </button>
          <button
            onClick={handleDelete}
            disabled={isPending}
            className="flex items-center gap-1.5 text-sm text-[#a0a0a0] hover:text-[#ef4444] transition-colors min-h-[44px] px-3 disabled:opacity-50"
          >
            <Trash2 className="w-5 h-5" />
            <span className="hidden sm:inline">삭제</span>
          </button>
        </>
      )}

      {/* Report (only if not owner) */}
      {!isOwner && (
        <button
          onClick={handleReport}
          disabled={isPending}
          className="flex items-center gap-1.5 text-sm text-[#a0a0a0] hover:text-[#ef4444] transition-colors min-h-[44px] px-3 disabled:opacity-50"
        >
          <Flag className="w-5 h-5" />
          <span className="hidden sm:inline">신고</span>
        </button>
      )}
    </div>
  );
}

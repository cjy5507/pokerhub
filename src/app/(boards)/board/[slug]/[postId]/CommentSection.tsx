'use client';

import { useState, useTransition } from 'react';
import { AuthorBadge } from '@/components/user/AuthorBadge';
import { Heart } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { createComment, toggleCommentLike } from '@/app/(boards)/actions';
import { cn } from '@/lib/utils';

interface CommentAuthor {
  id: string;
  nickname: string;
  level: number;
  avatarUrl?: string | null;
}

interface Comment {
  id: string;
  postId: string;
  parentId: string | null;
  content: string;
  likeCount: number;
  status: string;
  createdAt: Date;
  author: CommentAuthor | null;
  isLiked: boolean;
  replies?: Comment[];
}

interface CommentSectionProps {
  postId: string;
  comments: Comment[];
  currentUserId?: string;
}

export function CommentSection({ postId, comments, currentUserId }: CommentSectionProps) {
  const [isPending, startTransition] = useTransition();
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !currentUserId) return;

    startTransition(async () => {
      const result = await createComment({
        postId,
        content: commentText.trim(),
      });

      if (result.success) {
        setCommentText('');
        // Refresh will happen via revalidatePath
        window.location.reload();
      } else {
        alert(result.error || '댓글 작성 중 오류가 발생했습니다');
      }
    });
  };

  const handleSubmitReply = (parentId: string) => {
    if (!replyText.trim() || !currentUserId) return;

    startTransition(async () => {
      const result = await createComment({
        postId,
        content: replyText.trim(),
        parentId,
      });

      if (result.success) {
        setReplyText('');
        setReplyingTo(null);
        window.location.reload();
      } else {
        alert(result.error || '답글 작성 중 오류가 발생했습니다');
      }
    });
  };

  return (
    <div className="bg-[#1a1a1a] rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[#333]">
        <h2 className="text-lg font-bold text-[#e0e0e0]">
          댓글 {comments.reduce((acc, c) => acc + 1 + (c.replies?.length || 0), 0)}개
        </h2>
      </div>

      {/* Comment form */}
      <div className="p-6 border-b border-[#333]">
        {currentUserId ? (
          <form onSubmit={handleSubmitComment}>
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="댓글을 입력하세요"
              className="w-full px-4 py-3 bg-[#121212] border border-[#333] rounded-lg text-[#e0e0e0] placeholder:text-[#888] focus:outline-none focus:border-[#c9a227] resize-none"
              rows={3}
              disabled={isPending}
            />
            <div className="mt-3 flex justify-end">
              <button
                type="submit"
                disabled={isPending || !commentText.trim()}
                className="px-6 py-2 bg-[#c9a227] hover:bg-[#d4af37] disabled:bg-[#666] disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
              >
                {isPending ? '작성 중...' : '댓글 작성'}
              </button>
            </div>
          </form>
        ) : (
          <div className="text-center py-4 text-[#a0a0a0]">
            로그인이 필요합니다
          </div>
        )}
      </div>

      {/* Comments list */}
      <div className="divide-y divide-[#333]">
        {comments.length === 0 ? (
          <div className="py-12 text-center text-[#888]">
            첫 댓글을 작성해보세요
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id}>
              <CommentItem
                comment={comment}
                currentUserId={currentUserId}
                isPending={isPending}
                onReply={(id) => setReplyingTo(id)}
                isReplying={replyingTo === comment.id}
                replyText={replyText}
                setReplyText={setReplyText}
                onSubmitReply={() => handleSubmitReply(comment.id)}
                onCancelReply={() => {
                  setReplyingTo(null);
                  setReplyText('');
                }}
              />
              {/* Replies */}
              {comment.replies && comment.replies.length > 0 && (
                <div className="ml-12 border-l-2 border-[#333]">
                  {comment.replies.map((reply) => (
                    <CommentItem
                      key={reply.id}
                      comment={reply}
                      currentUserId={currentUserId}
                      isPending={isPending}
                      isReply
                    />
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

interface CommentItemProps {
  comment: Comment;
  currentUserId?: string;
  isPending: boolean;
  isReply?: boolean;
  onReply?: (id: string) => void;
  isReplying?: boolean;
  replyText?: string;
  setReplyText?: (text: string) => void;
  onSubmitReply?: () => void;
  onCancelReply?: () => void;
}

function CommentItem({
  comment,
  currentUserId,
  isPending,
  isReply = false,
  onReply,
  isReplying,
  replyText,
  setReplyText,
  onSubmitReply,
  onCancelReply,
}: CommentItemProps) {
  const [localLiked, setLocalLiked] = useState(comment.isLiked);
  const [localLikeCount, setLocalLikeCount] = useState(comment.likeCount);
  const [isLikePending, startLikeTransition] = useTransition();

  const handleLike = () => {
    if (!currentUserId || isLikePending) return;

    // Optimistic update
    const newLiked = !localLiked;
    const newCount = newLiked ? localLikeCount + 1 : localLikeCount - 1;
    setLocalLiked(newLiked);
    setLocalLikeCount(newCount);

    startLikeTransition(async () => {
      const result = await toggleCommentLike({ commentId: comment.id });
      if (!result.success) {
        // Rollback on error
        setLocalLiked(!newLiked);
        setLocalLikeCount(localLikeCount);
      }
    });
  };

  const timeAgo = formatDistanceToNow(comment.createdAt, {
    addSuffix: true,
    locale: ko,
  });

  return (
    <div className={cn('px-6 py-4', isReply && 'pl-8')}>
      {/* Author info */}
      <div className="flex items-center gap-3 mb-2">
        <AuthorBadge
          userId={comment.author?.id || ''}
          nickname={comment.author?.nickname || '알 수 없음'}
          level={comment.author?.level || 1}
          compact
        />
        <span className="text-xs text-[#888]">{timeAgo}</span>
      </div>

      {/* Content */}
      <div className="text-[#e0e0e0] mb-3 whitespace-pre-wrap">
        {comment.content}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleLike}
          disabled={!currentUserId || isLikePending}
          className={cn(
            'flex items-center gap-1.5 text-sm transition-colors disabled:opacity-50',
            localLiked ? 'text-[#ef4444]' : 'text-[#a0a0a0] hover:text-[#e0e0e0]'
          )}
        >
          <Heart
            className={cn('w-4 h-4', localLiked && 'fill-current')}
          />
          <span>{localLikeCount}</span>
        </button>

        {!isReply && currentUserId && onReply && (
          <button
            onClick={() => onReply(comment.id)}
            className="text-sm text-[#a0a0a0] hover:text-[#e0e0e0] transition-colors"
          >
            답글
          </button>
        )}
      </div>

      {/* Reply form */}
      {isReplying && (
        <div className="mt-4">
          <textarea
            value={replyText}
            onChange={(e) => setReplyText?.(e.target.value)}
            placeholder="답글을 입력하세요"
            className="w-full px-4 py-3 bg-[#121212] border border-[#333] rounded-lg text-[#e0e0e0] placeholder:text-[#888] focus:outline-none focus:border-[#c9a227] resize-none"
            rows={2}
            disabled={isPending}
          />
          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancelReply}
              className="px-4 py-1.5 text-sm text-[#a0a0a0] hover:text-[#e0e0e0] transition-colors"
            >
              취소
            </button>
            <button
              type="button"
              onClick={onSubmitReply}
              disabled={isPending || !replyText?.trim()}
              className="px-4 py-1.5 text-sm bg-[#c9a227] hover:bg-[#d4af37] disabled:bg-[#666] disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
            >
              답글 작성
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

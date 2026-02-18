'use client';

import { useState } from 'react';
import { Heart, MessageCircle, Share2, Trash2, Send, User } from 'lucide-react';
import { ThreadData, ThreadReplyData, toggleThreadLike, createThreadReply, getThreadReplies } from '@/app/(social)/actions';
import { formatRelativeTime } from '@/lib/utils/time';

interface ThreadCardProps {
  thread: ThreadData;
  currentUserId?: string;
  onDelete?: () => void;
}

export function ThreadCard({ thread, currentUserId, onDelete }: ThreadCardProps) {
  const [isLiked, setIsLiked] = useState(thread.isLiked);
  const [likesCount, setLikesCount] = useState(thread.likesCount);
  const [showReplies, setShowReplies] = useState(false);
  const [replies, setReplies] = useState<ThreadReplyData[]>([]);
  const [replyContent, setReplyContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTogglingLike, setIsTogglingLike] = useState(false);
  const [isLoadingReplies, setIsLoadingReplies] = useState(false);

  const isAuthor = currentUserId === thread.author.id;

  const handleLikeToggle = async () => {
    if (isTogglingLike || !currentUserId) return;

    setIsTogglingLike(true);
    const result = await toggleThreadLike(thread.id);

    if (result.success && result.likesCount !== undefined) {
      setIsLiked(!isLiked);
      setLikesCount(result.likesCount);
    }

    setIsTogglingLike(false);
  };

  const loadReplies = async () => {
    setIsLoadingReplies(true);
    const result = await getThreadReplies(thread.id);
    setReplies(result);
    setIsLoadingReplies(false);
  };

  const handleReplySubmit = async () => {
    if (!replyContent.trim() || isSubmitting || !currentUserId) return;

    setIsSubmitting(true);
    const result = await createThreadReply({
      threadId: thread.id,
      content: replyContent,
    });

    if (result.success) {
      setReplyContent('');
      loadReplies();
    }

    setIsSubmitting(false);
  };

  return (
    <div className="bg-op-surface border border-op-border rounded-lg p-4 space-y-3">
      {/* Author row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-op-elevated flex items-center justify-center">
            {thread.author.avatarUrl ? (
              <img
                src={thread.author.avatarUrl}
                alt={thread.author.nickname}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <User className="w-5 h-5 text-op-text-muted" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-op-text">
                {thread.author.nickname}
              </span>
              <span className="text-xs bg-op-elevated border border-op-border px-1.5 py-0.5 rounded text-op-text-secondary">
                Lv.{thread.author.level}
              </span>
            </div>
            <span className="text-xs text-op-text-muted">
              {formatRelativeTime(thread.createdAt)}
            </span>
          </div>
        </div>

        {isAuthor && onDelete && (
          <button
            onClick={onDelete}
            className="p-2 text-op-text-muted hover:text-op-error transition-colors"
            aria-label="삭제"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="text-op-text whitespace-pre-wrap text-sm">
        {thread.content}
      </div>

      {/* Image */}
      {thread.imageUrl && (
        <div className="rounded-lg overflow-hidden">
          <img
            src={thread.imageUrl}
            alt="Thread image"
            className="w-full max-h-[400px] object-cover"
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-4 pt-1">
        <button
          onClick={handleLikeToggle}
          disabled={isTogglingLike || !currentUserId}
          className={`flex items-center gap-1.5 transition-colors ${
            isLiked ? 'text-op-error' : 'text-op-text-secondary hover:text-op-error'
          } disabled:opacity-50`}
        >
          <Heart className="w-5 h-5" fill={isLiked ? 'currentColor' : 'none'} />
          <span className="text-sm">{likesCount}</span>
        </button>

        <button
          onClick={() => {
            const next = !showReplies;
            setShowReplies(next);
            if (next && replies.length === 0) {
              loadReplies();
            }
          }}
          className="flex items-center gap-1.5 text-op-text-secondary hover:text-op-gold transition-colors"
        >
          <MessageCircle className="w-5 h-5" />
          <span className="text-sm">{thread.repliesCount}</span>
        </button>

        <button
          className="flex items-center gap-1.5 text-op-text-secondary hover:text-op-gold transition-colors"
          aria-label="공유"
        >
          <Share2 className="w-5 h-5" />
        </button>
      </div>

      {/* Reply section */}
      {showReplies && (
        <div className="mt-3 pt-3 border-t border-op-border space-y-3">
          {/* Loading indicator */}
          {isLoadingReplies && (
            <div className="text-center py-3">
              <span className="text-xs text-op-text-muted">댓글 불러오는 중...</span>
            </div>
          )}

          {/* Reply list */}
          {replies.length > 0 && (
            <div className="space-y-2 bg-op-surface rounded-lg p-3">
              {replies.map((reply) => (
                <div key={reply.id} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-op-elevated flex items-center justify-center">
                      {reply.author.avatarUrl ? (
                        <img
                          src={reply.author.avatarUrl}
                          alt={reply.author.nickname}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <User className="w-3 h-3 text-op-text-muted" />
                      )}
                    </div>
                    <span className="text-xs font-medium text-op-text">
                      {reply.author.nickname}
                    </span>
                    <span className="text-xs text-op-text-muted">
                      Lv.{reply.author.level}
                    </span>
                    <span className="text-xs text-op-text-muted">
                      {formatRelativeTime(reply.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-op-text-secondary pl-8">{reply.content}</p>
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!isLoadingReplies && replies.length === 0 && (
            <p className="text-xs text-op-text-muted text-center py-2">아직 댓글이 없습니다</p>
          )}

          {/* Reply input */}
          {currentUserId && (
            <div className="flex gap-2">
              <input
                type="text"
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="댓글을 입력하세요..."
                className="flex-1 bg-op-elevated border border-op-border rounded-lg px-3 py-2 text-sm text-op-text placeholder:text-op-text-muted focus:outline-none focus:border-op-gold"
                maxLength={300}
              />
              <button
                onClick={handleReplySubmit}
                disabled={!replyContent.trim() || isSubmitting}
                className="px-4 py-2 bg-op-gold hover:bg-op-gold-hover text-black rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

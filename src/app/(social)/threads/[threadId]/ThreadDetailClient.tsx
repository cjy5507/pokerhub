'use client';

import { useState } from 'react';
import { ArrowLeft, User, Heart, MessageCircle, Share2, Trash2, Send } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ThreadData, ThreadReplyData, toggleThreadLike, createThreadReply, deleteThread } from '@/app/(social)/actions';
import { formatRelativeTime } from '@/lib/utils/time';

interface ThreadDetailClientProps {
  thread: ThreadData;
  replies: ThreadReplyData[];
  currentUserId?: string;
}

export function ThreadDetailClient({ thread: initialThread, replies: initialReplies, currentUserId }: ThreadDetailClientProps) {
  const router = useRouter();
  const [thread, setThread] = useState(initialThread);
  const [replies, setReplies] = useState(initialReplies);
  const [replyContent, setReplyContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTogglingLike, setIsTogglingLike] = useState(false);

  const isAuthor = currentUserId === thread.author.id;

  const handleLikeToggle = async () => {
    if (isTogglingLike || !currentUserId) return;

    setIsTogglingLike(true);
    const result = await toggleThreadLike(thread.id);

    if (result.success && result.likesCount !== undefined) {
      setThread((prev) => ({
        ...prev,
        isLiked: !prev.isLiked,
        likesCount: result.likesCount,
      }));
    }

    setIsTogglingLike(false);
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
      // Refresh to get new reply
      router.refresh();
    }

    setIsSubmitting(false);
  };

  const handleDelete = async () => {
    if (!confirm('쓰레드를 삭제하시겠습니까?')) return;

    const result = await deleteThread(thread.id);

    if (result.success) {
      router.push('/threads');
    } else {
      alert(result.error || '삭제에 실패했습니다');
    }
  };

  return (
    <div className="mx-auto max-w-[600px] px-4 py-6 space-y-6">
      {/* Back button */}
      <Link
        href="/threads"
        className="inline-flex items-center gap-2 text-sm text-op-text-secondary hover:text-op-gold transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        쓰레드로 돌아가기
      </Link>

      {/* Thread detail */}
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

          {isAuthor && (
            <button
              onClick={handleDelete}
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
              thread.isLiked ? 'text-op-error' : 'text-op-text-secondary hover:text-op-error'
            } disabled:opacity-50`}
          >
            <Heart className="w-5 h-5" fill={thread.isLiked ? 'currentColor' : 'none'} />
            <span className="text-sm">{thread.likesCount}</span>
          </button>

          <div className="flex items-center gap-1.5 text-op-text-secondary">
            <MessageCircle className="w-5 h-5" />
            <span className="text-sm">{thread.repliesCount}</span>
          </div>

          <button
            className="flex items-center gap-1.5 text-op-text-secondary hover:text-op-gold transition-colors"
            aria-label="공유"
          >
            <Share2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Replies */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-op-text">
          댓글 {replies.length}개
        </h2>

        {replies.length > 0 && (
          <div className="space-y-3">
            {replies.map((reply) => (
              <div
                key={reply.id}
                className="bg-op-surface border border-op-border rounded-lg p-4 space-y-2"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-op-elevated flex items-center justify-center">
                    {reply.author.avatarUrl ? (
                      <img
                        src={reply.author.avatarUrl}
                        alt={reply.author.nickname}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <User className="w-4 h-4 text-op-text-muted" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-op-text">
                        {reply.author.nickname}
                      </span>
                      <span className="text-xs bg-op-elevated border border-op-border px-1.5 py-0.5 rounded text-op-text-secondary">
                        Lv.{reply.author.level}
                      </span>
                    </div>
                    <span className="text-xs text-op-text-muted">
                      {formatRelativeTime(reply.createdAt)}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-op-text">{reply.content}</p>
              </div>
            ))}
          </div>
        )}

        {/* Reply input */}
        {currentUserId && (
          <div className="bg-op-surface border border-op-border rounded-lg p-4 space-y-3">
            <textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="댓글을 입력하세요..."
              className="w-full bg-op-elevated border border-op-border rounded-lg px-3 py-2 text-sm text-op-text placeholder:text-op-text-muted focus:outline-none focus:border-op-gold resize-none"
              rows={3}
              maxLength={300}
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-op-text-muted">
                {300 - replyContent.length}자
              </span>
              <button
                onClick={handleReplySubmit}
                disabled={!replyContent.trim() || isSubmitting}
                className="px-4 py-2 bg-op-gold hover:bg-op-gold-hover text-black text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                {isSubmitting ? '작성 중...' : '댓글 작성'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

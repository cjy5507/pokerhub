'use client';

import { useState } from 'react';
import { ThreadCard } from './ThreadCard';
import { ThreadCompose } from './ThreadCompose';
import { ThreadData, deleteThread, getThreadFeed } from '@/app/(social)/actions';

interface ThreadsFeedClientProps {
  initialThreads: ThreadData[];
  initialHasMore: boolean;
  currentUserId?: string;
}

export function ThreadsFeedClient({
  initialThreads,
  initialHasMore,
  currentUserId,
}: ThreadsFeedClientProps) {
  const [threads, setThreads] = useState(initialThreads);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleLoadMore = async () => {
    setIsLoading(true);
    const nextPage = page + 1;
    const result = await getThreadFeed(nextPage);

    if (result.threads.length > 0) {
      setThreads((prev) => [...prev, ...result.threads]);
      setHasMore(result.hasMore);
      setPage(nextPage);
    }

    setIsLoading(false);
  };

  const handleDelete = async (threadId: string) => {
    // TODO: Replace window.confirm with a custom dialog component for better UX
    if (!confirm('쓰레드를 삭제하시겠습니까?')) return;

    const result = await deleteThread(threadId);

    if (result.success) {
      setThreads((prev) => prev.filter((t) => t.id !== threadId));
    } else {
      setDeleteError(result.error || '삭제에 실패했습니다');
    }
  };

  const handleThreadCreated = (thread: ThreadData) => {
    setThreads((prev) => [thread, ...prev]);
  };

  return (
    <div className="space-y-4">
      {currentUserId && <ThreadCompose onThreadCreated={handleThreadCreated} />}
      {deleteError && (
        <p className="text-sm text-red-400 text-center">{deleteError}</p>
      )}

      {threads.length === 0 ? (
        <div className="bg-op-surface border border-op-border rounded-lg py-16 text-center">
          <div className="text-4xl mb-4">💬</div>
          <p className="text-op-text-secondary text-sm mb-1">아직 쓰레드가 없습니다</p>
          <p className="text-op-text-muted text-xs">
            {currentUserId ? '첫 번째 쓰레드를 작성해보세요!' : '로그인 후 쓰레드를 작성할 수 있습니다.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {threads.map((thread) => (
            <ThreadCard
              key={thread.id}
              thread={thread}
              currentUserId={currentUserId}
              onDelete={() => handleDelete(thread.id)}
            />
          ))}
        </div>
      )}

      {hasMore && (
        <button
          onClick={handleLoadMore}
          disabled={isLoading}
          className="w-full py-3 bg-op-surface border border-op-border hover:border-op-gold rounded-lg text-sm text-op-text transition-colors disabled:opacity-50"
        >
          {isLoading ? '로딩 중...' : '더 보기'}
        </button>
      )}
    </div>
  );
}

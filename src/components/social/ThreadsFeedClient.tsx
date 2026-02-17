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
    if (!confirm('쓰레드를 삭제하시겠습니까?')) return;

    const result = await deleteThread(threadId);

    if (result.success) {
      setThreads((prev) => prev.filter((t) => t.id !== threadId));
    } else {
      alert(result.error || '삭제에 실패했습니다');
    }
  };

  const handleThreadCreated = (thread: ThreadData) => {
    setThreads((prev) => [thread, ...prev]);
  };

  return (
    <div className="space-y-4">
      {currentUserId && <ThreadCompose onThreadCreated={handleThreadCreated} />}

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

      {hasMore && (
        <button
          onClick={handleLoadMore}
          disabled={isLoading}
          className="w-full py-3 bg-[#1e1e1e] border border-[#333] hover:border-[#c9a227] rounded-lg text-sm text-[#e0e0e0] transition-colors disabled:opacity-50"
        >
          {isLoading ? '로딩 중...' : '더 보기'}
        </button>
      )}
    </div>
  );
}

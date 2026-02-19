import type { Metadata } from 'next';
import { getSession } from '@/lib/auth/session';

export const metadata: Metadata = {
  title: '스레드 | Open Poker',
  description: '오픈포커 커뮤니티 스레드 — 포커 이야기를 나눠보세요.',
};
import { getThreadFeed } from '@/app/(social)/actions';
import { ThreadsFeedClient } from '@/components/social/ThreadsFeedClient';

export default async function ThreadsPage() {
  const session = await getSession();
  const { threads, hasMore } = await getThreadFeed(1);

  return (
    <div className="mx-auto max-w-[600px] px-4 py-6 pb-20 lg:pb-0 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-op-text">쓰레드</h1>
      </div>

      <ThreadsFeedClient
        initialThreads={threads}
        initialHasMore={hasMore}
        currentUserId={session?.userId}
      />
    </div>
  );
}

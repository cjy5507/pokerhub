import { getSession } from '@/lib/auth/session';
import { getThreadFeed } from '@/app/(social)/actions';
import { ThreadsFeedClient } from '@/components/social/ThreadsFeedClient';

export default async function ThreadsPage() {
  const session = await getSession();
  const { threads, hasMore } = await getThreadFeed(1);

  return (
    <div className="mx-auto max-w-[600px] px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#e0e0e0]">쓰레드</h1>
      </div>

      <ThreadsFeedClient
        initialThreads={threads}
        initialHasMore={hasMore}
        currentUserId={session?.userId}
      />
    </div>
  );
}

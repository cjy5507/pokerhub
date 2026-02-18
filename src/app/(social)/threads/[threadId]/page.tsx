import { getSession } from '@/lib/auth/session';
import { getThreadDetail, createThreadReply } from '@/app/(social)/actions';
import { ThreadDetailClient } from './ThreadDetailClient';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';

interface ThreadDetailPageProps {
  params: Promise<{ threadId: string }>;
}

export default async function ThreadDetailPage({ params }: ThreadDetailPageProps) {
  const { threadId } = await params;
  const session = await getSession();
  const { thread, replies } = await getThreadDetail(threadId);

  if (!thread) {
    // Check if this is a DB connection issue
    if (!db) {
      return (
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <div className="bg-ph-surface rounded-lg p-8 border border-ph-border">
            <h2 className="text-xl font-bold text-ph-text mb-4">데이터베이스 연결 필요</h2>
            <p className="text-ph-text-secondary mb-2">데이터를 불러올 수 없습니다.</p>
            <p className="text-sm text-ph-text-dim">.env 파일의 DATABASE_URL 설정을 확인해주세요.</p>
          </div>
        </div>
      );
    }
    // Thread truly doesn't exist
    notFound();
  }

  return (
    <ThreadDetailClient
      thread={thread}
      replies={replies}
      currentUserId={session?.userId}
    />
  );
}

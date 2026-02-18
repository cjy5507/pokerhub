import { notFound, redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { getBoard, getBoards } from '@/lib/queries/boards';
import { PostEditor } from './PostEditor';

interface WritePageProps {
  params: Promise<{ slug: string }>;
}

export default async function WritePage({ params }: WritePageProps) {
  const { slug } = await params;

  // Check authentication
  const session = await getSession();
  if (!session) {
    redirect(`/login?redirect=/board/${slug}/write`);
  }

  // Get all boards for selector
  const allBoards = await getBoards();

  // Get board
  const board = await getBoard(slug);
  if (!board || !board.isActive) {
    // Check if this is a DB connection issue
    if (allBoards.length === 0) {
      // Likely a DB connection issue
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
    // Board truly doesn't exist or is inactive
    notFound();
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-ph-text mb-6">글쓰기</h1>
      <PostEditor
        currentBoardId={board.id}
        currentBoardSlug={slug}
        boards={allBoards}
        userId={session.userId}
      />
    </div>
  );
}

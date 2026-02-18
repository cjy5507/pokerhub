import { getHand } from '../../actions';
import { notFound } from 'next/navigation';
import { HandDetailClient } from './HandDetailClient';
import { db } from '@/lib/db';

export default async function HandDetailPage({ params }: { params: Promise<{ handId: string }> }) {
  const { handId } = await params;
  const hand = await getHand(handId);

  if (!hand) {
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
    // Hand truly doesn't exist
    notFound();
  }

  return <HandDetailClient hand={hand} />;
}

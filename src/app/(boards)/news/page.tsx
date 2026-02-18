import type { Metadata } from 'next';
import { getNewsItems } from '@/lib/rss';
import { getUserNewsBookmarkIds } from './actions';
import { NewsClient } from './NewsClient';

export const metadata: Metadata = {
  title: '포커 뉴스 - PokerHub',
  description:
    '해외 포커 뉴스, 대회 정보, 전략 아티클을 실시간으로 확인하세요. Upswing Poker, PokerNews 등 해외 주요 소스의 뉴스를 한국어로 번역하여 제공합니다.',
  keywords: ['포커 뉴스', '포커 전략', '홀덤', '텍사스 홀덤', 'poker news', 'poker strategy'],
  openGraph: {
    title: '포커 뉴스 - PokerHub',
    description: '해외 포커 뉴스, 대회 정보, 전략 아티클을 실시간으로 확인하세요.',
    type: 'website',
  },
};

// Revalidate every 30 minutes
export const revalidate = 1800;

export default async function NewsPage() {
  const [{ items, total }, bookmarkIdsResult] = await Promise.all([
    getNewsItems({ page: 1, limit: 20 }),
    getUserNewsBookmarkIds(),
  ]);

  const initialBookmarkIds = Array.isArray(bookmarkIdsResult) ? bookmarkIdsResult : [];

  return (
    <NewsClient
      initialItems={items}
      initialTotal={total}
      initialBookmarkIds={initialBookmarkIds}
    />
  );
}

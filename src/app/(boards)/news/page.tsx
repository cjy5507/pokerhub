import { getNewsItems } from '@/lib/rss';
import { NewsClient } from './NewsClient';

export const metadata = {
  title: '뉴스 - PokerHub',
  description: '포커 관련 최신 뉴스, 대회 정보, 전략 아티클을 확인하세요.',
};

// Revalidate every 30 minutes
export const revalidate = 1800;

export default async function NewsPage() {
  const { items, total } = await getNewsItems({ page: 1, limit: 20 });

  return <NewsClient initialItems={items} initialTotal={total} />;
}

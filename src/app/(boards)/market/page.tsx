import { db } from '@/lib/db';
import { marketItems, users } from '@/lib/db/schema';
import { desc, eq } from 'drizzle-orm';
import { MarketClient } from './MarketClient';

export const metadata = {
  title: '마켓 - PokerHub',
  description: '포커 용품, 디지털 상품, 공동구매를 만나보세요.',
};

export const revalidate = 60; // Revalidate every minute

export type MarketItemWithSeller = {
  id: string;
  sellerId: string;
  title: string;
  description: string;
  category: 'poker_goods' | 'digital' | 'group_buy' | 'event';
  price: number;
  originalPrice: number | null;
  imageUrl: string | null;
  status: 'open' | 'funded' | 'closed' | 'cancelled';
  isGroupBuy: boolean;
  targetCount: number | null;
  currentCount: number;
  deadline: Date | null;
  viewCount: number;
  likeCount: number;
  createdAt: Date;
  seller: {
    nickname: string;
    avatarUrl: string | null;
  };
};

async function getMarketItems(): Promise<MarketItemWithSeller[]> {
  if (!db) return [];

  try {
    const items = await db
      .select({
        id: marketItems.id,
        sellerId: marketItems.sellerId,
        title: marketItems.title,
        description: marketItems.description,
        category: marketItems.category,
        price: marketItems.price,
        originalPrice: marketItems.originalPrice,
        imageUrl: marketItems.imageUrl,
        status: marketItems.status,
        isGroupBuy: marketItems.isGroupBuy,
        targetCount: marketItems.targetCount,
        currentCount: marketItems.currentCount,
        deadline: marketItems.deadline,
        viewCount: marketItems.viewCount,
        likeCount: marketItems.likeCount,
        createdAt: marketItems.createdAt,
        sellerNickname: users.nickname,
        sellerAvatarUrl: users.avatarUrl,
      })
      .from(marketItems)
      .leftJoin(users, eq(marketItems.sellerId, users.id))
      .orderBy(desc(marketItems.createdAt))
      .limit(50);

    return items.map((item: Record<string, any>) => ({
      id: item.id,
      sellerId: item.sellerId,
      title: item.title,
      description: item.description,
      category: item.category,
      price: item.price,
      originalPrice: item.originalPrice,
      imageUrl: item.imageUrl,
      status: item.status,
      isGroupBuy: item.isGroupBuy,
      targetCount: item.targetCount,
      currentCount: item.currentCount,
      deadline: item.deadline,
      viewCount: item.viewCount,
      likeCount: item.likeCount,
      createdAt: item.createdAt,
      seller: {
        nickname: item.sellerNickname ?? '알 수 없음',
        avatarUrl: item.sellerAvatarUrl,
      },
    }));
  } catch (error) {
    console.error('Failed to fetch market items:', error);
    return [];
  }
}

export default async function MarketPage() {
  const items = await getMarketItems();

  return <MarketClient initialItems={items} />;
}

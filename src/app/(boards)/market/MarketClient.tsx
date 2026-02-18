'use client';

import { useState, useMemo } from 'react';
import {
  Store,
  Heart,
  Eye,
  Clock,
  Plus,
  ShoppingBag,
  Gamepad2,
  Monitor,
  Users,
  PartyPopper,
  SlidersHorizontal,
  Package,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { MarketItemWithSeller } from './page';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

type CategoryFilter = 'all' | 'poker_goods' | 'digital' | 'group_buy' | 'event';
type SortOption = 'latest' | 'popular' | 'price_asc' | 'price_desc';

const CATEGORY_TABS: { key: CategoryFilter; label: string; icon: typeof Store }[] = [
  { key: 'all', label: '전체', icon: Store },
  { key: 'poker_goods', label: '포커용품', icon: ShoppingBag },
  { key: 'digital', label: '디지털', icon: Monitor },
  { key: 'group_buy', label: '공동구매', icon: Users },
  { key: 'event', label: '이벤트', icon: PartyPopper },
];

const SORT_OPTIONS: { key: SortOption; label: string }[] = [
  { key: 'latest', label: '최신순' },
  { key: 'popular', label: '인기순' },
  { key: 'price_asc', label: '낮은가격순' },
  { key: 'price_desc', label: '높은가격순' },
];

const CATEGORY_LABEL: Record<string, string> = {
  poker_goods: '포커용품',
  digital: '디지털',
  group_buy: '공동구매',
  event: '이벤트',
};

const STATUS_LABEL: Record<string, string> = {
  open: '모집중',
  funded: '달성',
  closed: '마감',
  cancelled: '취소',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getDaysRemaining(deadline: Date | null): number | null {
  if (!deadline) return null;
  const now = new Date();
  const diff = new Date(deadline).getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function formatPrice(price: number): string {
  return price.toLocaleString();
}

// ---------------------------------------------------------------------------
// ItemCard
// ---------------------------------------------------------------------------

function ItemCard({ item }: { item: MarketItemWithSeller }) {
  const daysRemaining = getDaysRemaining(item.deadline);
  const progressPercent =
    item.isGroupBuy && item.targetCount
      ? Math.min(100, Math.round((item.currentCount / item.targetCount) * 100))
      : null;

  const hasDiscount = item.originalPrice && item.originalPrice > item.price;
  const discountPercent = hasDiscount
    ? Math.round(((item.originalPrice! - item.price) / item.originalPrice!) * 100)
    : null;

  return (
    <div className="group bg-op-surface border border-op-border rounded-xl overflow-hidden hover:border-op-border-medium transition-all hover:shadow-lg hover:shadow-black/10">
      {/* Image placeholder */}
      <div className="relative aspect-[4/3] bg-op-elevated flex items-center justify-center overflow-hidden">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <Package className="w-12 h-12 text-op-text-muted" />
        )}

        {/* Category badge */}
        <span className="absolute top-2 left-2 px-2 py-0.5 text-xs font-medium rounded-md bg-op-info-dim text-op-info">
          {CATEGORY_LABEL[item.category] ?? item.category}
        </span>

        {/* Status badge for non-open items */}
        {item.status !== 'open' && (
          <span
            className={cn(
              'absolute top-2 right-2 px-2 py-0.5 text-xs font-bold rounded-md',
              item.status === 'funded' && 'bg-op-success-dim text-op-success',
              item.status === 'closed' && 'bg-op-elevated text-op-text-muted',
              item.status === 'cancelled' && 'bg-op-error-dim text-op-error',
            )}
          >
            {STATUS_LABEL[item.status]}
          </span>
        )}

        {/* Discount badge */}
        {discountPercent && (
          <span className="absolute bottom-2 left-2 px-2 py-0.5 text-xs font-bold rounded-md bg-op-error text-white">
            -{discountPercent}%
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-3 space-y-2">
        {/* Title */}
        <h3 className="text-sm font-semibold text-op-text line-clamp-2 leading-snug min-h-[2.5rem]">
          {item.title}
        </h3>

        {/* Price */}
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold text-op-gold">
            {formatPrice(item.price)}P
          </span>
          {hasDiscount && (
            <span className="text-sm text-op-text-muted line-through">
              {formatPrice(item.originalPrice!)}P
            </span>
          )}
        </div>

        {/* Group buy progress */}
        {item.isGroupBuy && item.targetCount && (
          <div className="space-y-1">
            <div className="h-2 bg-op-elevated rounded-full overflow-hidden">
              <div
                className="h-full bg-op-gold rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-op-text-secondary">
                {item.currentCount}/{item.targetCount}명
              </span>
              {daysRemaining !== null && (
                <span
                  className={cn(
                    'font-medium',
                    daysRemaining <= 3 ? 'text-op-error' : 'text-op-text-secondary',
                  )}
                >
                  <Clock className="inline w-3 h-3 mr-0.5 -mt-px" />
                  D-{daysRemaining}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Stats row */}
        <div className="flex items-center gap-3 text-xs text-op-text-muted pt-1 border-t border-op-border">
          <span className="flex items-center gap-1">
            <Heart className="w-3.5 h-3.5" />
            {item.likeCount}
          </span>
          <span className="flex items-center gap-1">
            <Eye className="w-3.5 h-3.5" />
            {item.viewCount}
          </span>
          <span className="ml-auto text-op-text-muted truncate max-w-[80px]">
            {item.seller.nickname}
          </span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MarketClient
// ---------------------------------------------------------------------------

export function MarketClient({
  initialItems,
}: {
  initialItems: MarketItemWithSeller[];
}) {
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [sort, setSort] = useState<SortOption>('latest');

  // Filtered + sorted items
  const items = useMemo(() => {
    const filtered =
      category === 'all'
        ? initialItems
        : initialItems.filter((item) => item.category === category);

    // Sort
    const sorted = [...filtered];
    switch (sort) {
      case 'latest':
        sorted.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        break;
      case 'popular':
        sorted.sort((a, b) => b.likeCount - a.likeCount);
        break;
      case 'price_asc':
        sorted.sort((a, b) => a.price - b.price);
        break;
      case 'price_desc':
        sorted.sort((a, b) => b.price - a.price);
        break;
    }

    return sorted;
  }, [initialItems, category, sort]);

  return (
    <div className="min-h-screen bg-op-bg text-op-text pb-20">
      {/* Hero */}
      <div className="border-b border-op-border bg-op-surface">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-gradient-to-br from-op-gold to-op-gold-hover rounded-xl shadow-lg shadow-op-gold/20">
              <Store size={28} className="text-black" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-op-text">
                마켓
              </h1>
              <p className="text-sm text-op-text-secondary">
                포커 용품, 디지털 상품, 공동구매
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">
        {/* Category Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {CATEGORY_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = category === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setCategory(tab.key)}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
                  isActive
                    ? 'bg-op-gold text-black'
                    : 'bg-op-surface border border-op-border text-op-text-secondary hover:text-op-text hover:border-op-border-medium',
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Filter bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <SlidersHorizontal className="w-4 h-4 text-op-text-muted" />
            <div className="flex items-center gap-1 bg-op-surface border border-op-border rounded-lg p-0.5">
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setSort(opt.key)}
                  className={cn(
                    'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                    sort === opt.key
                      ? 'bg-op-elevated text-op-text'
                      : 'text-op-text-muted hover:text-op-text',
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Write button */}
          <Link
            href="/login"
            className="flex items-center gap-1.5 px-4 py-2 bg-op-gold hover:bg-op-gold-hover text-black text-sm font-bold rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            상품 등록
          </Link>
        </div>

        {/* Item Grid */}
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-op-text-muted">
            <Gamepad2 className="w-16 h-16 mb-4 opacity-30" />
            <p className="text-lg font-medium">등록된 상품이 없습니다</p>
            <p className="text-sm mt-1">첫 번째 상품을 등록해보세요!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import { useState, useCallback } from 'react';
import { ExternalLink, Newspaper, Loader2 } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils/time';
import { FEED_CATEGORIES, SOURCE_COLORS, type FeedCategory } from '@/lib/rss/feeds';
import type { NewsItem } from '@/lib/rss';

interface NewsClientProps {
  initialItems: NewsItem[];
  initialTotal: number;
}

export function NewsClient({ initialItems, initialTotal }: NewsClientProps) {
  const [items, setItems] = useState<NewsItem[]>(initialItems);
  const [total, setTotal] = useState(initialTotal);
  const [category, setCategory] = useState<FeedCategory>('all');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchNews = useCallback(async (cat: FeedCategory, pg: number, append: boolean) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      const res = await fetch(`/api/news?category=${cat}&page=${pg}&limit=20`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();

      if (append) {
        setItems((prev) => [...prev, ...data.items]);
      } else {
        setItems(data.items);
      }
      setTotal(data.total);
      setPage(pg);
    } catch (error) {
      console.error('Failed to fetch news:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  const handleCategoryChange = (cat: FeedCategory) => {
    if (cat === category) return;
    setCategory(cat);
    setPage(1);
    fetchNews(cat, 1, false);
  };

  const handleLoadMore = () => {
    fetchNews(category, page + 1, true);
  };

  const hasMore = page * 20 < total;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#e0e0e0] mb-2">포커 뉴스</h1>
        <p className="text-sm text-[#a0a0a0]">
          해외 포커 뉴스, 대회 정보, 전략 아티클을 한눈에 확인하세요.
        </p>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-1 overflow-x-auto scrollbar-hide border-b border-[#333] mb-6">
        {FEED_CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => handleCategoryChange(cat.key)}
            className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
              category === cat.key
                ? 'text-[#c9a227] border-[#c9a227]'
                : 'text-[#a0a0a0] border-transparent hover:text-[#e0e0e0]'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-lg p-4 animate-pulse"
            >
              <div className="h-4 w-20 bg-[#2a2a2a] rounded mb-3" />
              <div className="h-5 w-full bg-[#2a2a2a] rounded mb-2" />
              <div className="h-5 w-3/4 bg-[#2a2a2a] rounded mb-4" />
              <div className="h-4 w-full bg-[#2a2a2a] rounded mb-2" />
              <div className="h-4 w-2/3 bg-[#2a2a2a] rounded mb-4" />
              <div className="flex justify-between">
                <div className="h-3 w-16 bg-[#2a2a2a] rounded" />
                <div className="h-3 w-20 bg-[#2a2a2a] rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        /* Empty State */
        <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-lg py-16 text-center">
          <Newspaper className="w-12 h-12 text-[#555] mx-auto mb-4" />
          <p className="text-[#a0a0a0] text-sm">뉴스를 불러올 수 없습니다.</p>
          <p className="text-[#888] text-xs mt-1">잠시 후 다시 시도해주세요.</p>
        </div>
      ) : (
        /* News Grid */
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {items.map((item) => (
              <NewsCard key={item.id} item={item} />
            ))}
          </div>

          {/* Load More */}
          {hasMore && (
            <div className="mt-8 text-center">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#1e1e1e] border border-[#2a2a2a] rounded-lg text-sm text-[#e0e0e0] hover:bg-[#2a2a2a] hover:border-[#333] transition-colors disabled:opacity-50"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    불러오는 중...
                  </>
                ) : (
                  '더 보기'
                )}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function NewsCard({ item }: { item: NewsItem }) {
  const sourceColor = SOURCE_COLORS[item.source] || '#888';

  return (
    <a
      href={item.link}
      target="_blank"
      rel="noopener noreferrer"
      className="group block bg-[#1e1e1e] border border-[#2a2a2a] rounded-lg p-4 hover:border-[#444] hover:bg-[#242424] transition-all"
    >
      {/* Source Badge */}
      <div className="flex items-center gap-2 mb-3">
        <span
          className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold text-white"
          style={{ backgroundColor: sourceColor }}
        >
          {item.source}
        </span>
        {item.lang === 'en' && (
          <span className="text-[10px] text-[#888] border border-[#444] rounded px-1.5 py-0.5">
            EN
          </span>
        )}
      </div>

      {/* Korean Title (main) */}
      <h3 className="text-sm font-medium text-[#e0e0e0] group-hover:text-[#c9a227] transition-colors line-clamp-2 mb-1 leading-relaxed">
        {item.titleKo}
      </h3>

      {/* Original Title (if different from Korean) */}
      {item.lang === 'en' && item.titleKo !== item.title && (
        <p className="text-xs text-[#888] line-clamp-1 mb-2 leading-relaxed">
          {item.title}
        </p>
      )}

      {/* Korean Description */}
      {item.descriptionKo && (
        <p className="text-xs text-[#a0a0a0] line-clamp-3 mb-4 leading-relaxed">
          {item.descriptionKo}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-auto pt-2 border-t border-[#2a2a2a]">
        <span className="text-[11px] text-[#888]">
          {formatRelativeTime(item.pubDate)}
        </span>
        <span className="inline-flex items-center gap-1 text-[11px] text-[#c9a227] opacity-0 group-hover:opacity-100 transition-opacity">
          원문 보기
          <ExternalLink className="w-3 h-3" />
        </span>
      </div>
    </a>
  );
}

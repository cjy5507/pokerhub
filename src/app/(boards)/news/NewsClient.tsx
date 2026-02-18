'use client';

import { useState, useCallback, useTransition } from 'react';
import { ExternalLink, Newspaper, Loader2, Bookmark } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/utils/time';
import { FEED_CATEGORIES, SOURCE_COLORS, type FeedCategory } from '@/lib/rss/feeds';
import type { NewsItem } from '@/lib/rss';
import type { BookmarkedNewsItem } from './actions';
import { toggleNewsBookmark, getBookmarkedNews } from './actions';

interface NewsClientProps {
  initialItems: NewsItem[];
  initialTotal: number;
  initialBookmarkIds: string[];
}

type TabKey = FeedCategory | 'bookmarks';

const ALL_TABS = [
  ...FEED_CATEGORIES,
  { key: 'bookmarks' as const, label: '북마크' },
];

export function NewsClient({ initialItems, initialTotal, initialBookmarkIds }: NewsClientProps) {
  const [items, setItems] = useState<NewsItem[]>(initialItems);
  const [total, setTotal] = useState(initialTotal);
  const [tab, setTab] = useState<TabKey>('all');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [bookmarkIds, setBookmarkIds] = useState<Set<string>>(new Set(initialBookmarkIds));
  const [bookmarkedItems, setBookmarkedItems] = useState<BookmarkedNewsItem[]>([]);
  const [bookmarksLoading, setBookmarksLoading] = useState(false);
  const [bookmarksPending, startBookmarkTransition] = useTransition();

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

  const fetchBookmarks = useCallback(async () => {
    setBookmarksLoading(true);
    try {
      const result = await getBookmarkedNews();
      if (Array.isArray(result)) {
        setBookmarkedItems(result);
      }
    } catch (error) {
      console.error('Failed to fetch bookmarks:', error);
    } finally {
      setBookmarksLoading(false);
    }
  }, []);

  const handleTabChange = (key: TabKey) => {
    if (key === tab) return;
    setTab(key);
    if (key === 'bookmarks') {
      fetchBookmarks();
    } else {
      setPage(1);
      fetchNews(key, 1, false);
    }
  };

  const handleLoadMore = () => {
    if (tab !== 'bookmarks') {
      fetchNews(tab as FeedCategory, page + 1, true);
    }
  };

  const handleBookmark = (item: NewsItem) => {
    startBookmarkTransition(async () => {
      const result = await toggleNewsBookmark(item.id, item.titleKo, item.link, item.source);
      if ('error' in result) return;
      setBookmarkIds((prev) => {
        const next = new Set(prev);
        if (result.bookmarked) {
          next.add(item.id);
        } else {
          next.delete(item.id);
          // Also remove from bookmarked items list if on bookmarks tab
          setBookmarkedItems((bi) => bi.filter((b) => b.newsId !== item.id));
        }
        return next;
      });
    });
  };

  const hasMore = tab !== 'bookmarks' && page * 20 < total;
  const isBookmarksTab = tab === 'bookmarks';

  // Build JSON-LD structured data from current visible items
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: items.slice(0, 10).map((item, i) => ({
      '@type': 'NewsArticle',
      position: i + 1,
      headline: item.titleKo,
      url: item.link,
      datePublished: item.pubDate,
      publisher: { '@type': 'Organization', name: item.source },
    })),
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ph-text mb-2">포커 뉴스</h1>
        <p className="text-sm text-ph-text-secondary">
          해외 포커 뉴스, 대회 정보, 전략 아티클을 한눈에 확인하세요.
        </p>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-1 overflow-x-auto scrollbar-hide border-b border-ph-border mb-6">
        {ALL_TABS.map((cat) => (
          <button
            key={cat.key}
            onClick={() => handleTabChange(cat.key)}
            className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
              tab === cat.key
                ? 'text-ph-gold border-ph-gold'
                : 'text-ph-text-secondary border-transparent hover:text-ph-text'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Bookmarks Tab Content */}
      {isBookmarksTab ? (
        bookmarksLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="bg-ph-surface border border-ph-elevated rounded-lg p-4 animate-pulse"
              >
                <div className="h-4 w-20 bg-ph-elevated rounded mb-3" />
                <div className="h-5 w-full bg-ph-elevated rounded mb-2" />
                <div className="h-5 w-3/4 bg-ph-elevated rounded mb-4" />
                <div className="flex justify-between">
                  <div className="h-3 w-16 bg-ph-elevated rounded" />
                  <div className="h-3 w-20 bg-ph-elevated rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : bookmarkedItems.length === 0 ? (
          <div className="bg-ph-surface border border-ph-elevated rounded-lg py-16 text-center">
            <Bookmark className="w-12 h-12 text-ph-text-secondary mx-auto mb-4" />
            <p className="text-ph-text-secondary text-sm">북마크한 뉴스가 없습니다.</p>
            <p className="text-ph-text-muted text-xs mt-1">뉴스 카드의 북마크 버튼을 눌러 저장하세요.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {bookmarkedItems.map((item) => (
              <BookmarkedCard key={item.newsId} item={item} />
            ))}
          </div>
        )
      ) : /* News Tabs Content */
      loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="bg-ph-surface border border-ph-elevated rounded-lg p-4 animate-pulse"
            >
              <div className="h-4 w-20 bg-ph-elevated rounded mb-3" />
              <div className="h-5 w-full bg-ph-elevated rounded mb-2" />
              <div className="h-5 w-3/4 bg-ph-elevated rounded mb-4" />
              <div className="h-4 w-full bg-ph-elevated rounded mb-2" />
              <div className="h-4 w-2/3 bg-ph-elevated rounded mb-4" />
              <div className="flex justify-between">
                <div className="h-3 w-16 bg-ph-elevated rounded" />
                <div className="h-3 w-20 bg-ph-elevated rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="bg-ph-surface border border-ph-elevated rounded-lg py-16 text-center">
          <Newspaper className="w-12 h-12 text-ph-text-secondary mx-auto mb-4" />
          <p className="text-ph-text-secondary text-sm">뉴스를 불러올 수 없습니다.</p>
          <p className="text-ph-text-muted text-xs mt-1">잠시 후 다시 시도해주세요.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {items.map((item) => (
              <NewsCard
                key={item.id}
                item={item}
                isBookmarked={bookmarkIds.has(item.id)}
                onBookmark={handleBookmark}
              />
            ))}
          </div>

          {hasMore && (
            <div className="mt-8 text-center">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="inline-flex items-center gap-2 px-6 py-3 bg-ph-surface border border-ph-elevated rounded-lg text-sm text-ph-text hover:bg-ph-elevated hover:border-ph-border transition-colors disabled:opacity-50"
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

interface NewsCardProps {
  item: NewsItem;
  isBookmarked: boolean;
  onBookmark: (item: NewsItem) => void;
}

function NewsCard({ item, isBookmarked, onBookmark }: NewsCardProps) {
  const sourceColor = SOURCE_COLORS[item.source] || '#888';

  return (
    <div className="group relative bg-ph-surface border border-ph-elevated rounded-lg p-4 hover:border-ph-border-medium hover:bg-ph-elevated transition-all">
      {/* Bookmark Button */}
      <button
        onClick={(e) => {
          e.preventDefault();
          onBookmark(item);
        }}
        className="absolute top-3 right-3 p-1.5 rounded-md hover:bg-ph-elevated transition-colors z-10"
        aria-label={isBookmarked ? '북마크 해제' : '북마크 추가'}
      >
        <Bookmark
          className={cn(
            'w-4 h-4 transition-colors',
            isBookmarked ? 'fill-ph-gold text-ph-gold' : 'text-ph-text-muted hover:text-ph-text'
          )}
        />
      </button>

      <a
        href={item.link}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
      >
        {/* Source Badge */}
        <div className="flex items-center gap-2 mb-3 pr-8">
          <span
            className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold text-white"
            style={{ backgroundColor: sourceColor }}
          >
            {item.source}
          </span>
          {item.lang === 'en' && (
            <span className="text-[10px] text-ph-text-muted border border-ph-border-medium rounded px-1.5 py-0.5">
              EN
            </span>
          )}
        </div>

        {/* Korean Title (main) */}
        <h3 className="text-sm font-medium text-ph-text group-hover:text-ph-gold transition-colors line-clamp-2 mb-1 leading-relaxed">
          {item.titleKo}
        </h3>

        {/* Original Title (if different from Korean) */}
        {item.lang === 'en' && item.titleKo !== item.title && (
          <p className="text-xs text-ph-text-muted line-clamp-1 mb-2 leading-relaxed">
            {item.title}
          </p>
        )}

        {/* Korean Description */}
        {item.descriptionKo && (
          <p className="text-xs text-ph-text-secondary line-clamp-3 mb-4 leading-relaxed">
            {item.descriptionKo}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-auto pt-2 border-t border-ph-elevated">
          <span className="text-[11px] text-ph-text-muted" suppressHydrationWarning>
            {formatRelativeTime(item.pubDate)}
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] text-ph-gold opacity-0 group-hover:opacity-100 transition-opacity">
            원문 보기
            <ExternalLink className="w-3 h-3" />
          </span>
        </div>
      </a>
    </div>
  );
}

function BookmarkedCard({ item }: { item: BookmarkedNewsItem }) {
  const sourceColor = SOURCE_COLORS[item.source] || '#888';

  return (
    <a
      href={item.link}
      target="_blank"
      rel="noopener noreferrer"
      className="group block bg-ph-surface border border-ph-elevated rounded-lg p-4 hover:border-ph-border-medium hover:bg-ph-elevated transition-all"
    >
      {/* Source Badge */}
      <div className="flex items-center gap-2 mb-3">
        <span
          className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold text-white"
          style={{ backgroundColor: sourceColor }}
        >
          {item.source}
        </span>
        <Bookmark className="w-3 h-3 fill-ph-gold text-ph-gold ml-auto" />
      </div>

      {/* Title */}
      <h3 className="text-sm font-medium text-ph-text group-hover:text-ph-gold transition-colors line-clamp-2 mb-4 leading-relaxed">
        {item.title}
      </h3>

      {/* Footer */}
      <div className="flex items-center justify-between mt-auto pt-2 border-t border-ph-elevated">
        <span className="text-[11px] text-ph-text-muted" suppressHydrationWarning>
          {formatRelativeTime(item.createdAt.toString())}
        </span>
        <span className="inline-flex items-center gap-1 text-[11px] text-ph-gold opacity-0 group-hover:opacity-100 transition-opacity">
          원문 보기
          <ExternalLink className="w-3 h-3" />
        </span>
      </div>
    </a>
  );
}

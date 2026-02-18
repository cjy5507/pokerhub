'use client';

import Link from 'next/link';
import { Newspaper, ChevronRight, Megaphone, Flame } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils/time';
import { SOURCE_COLORS } from '@/lib/rss/feeds';
import type { NewsItem } from '@/lib/rss';
import type { PostData } from './page';

interface HomeClientProps {
  newsItems: NewsItem[];
  noticePosts: PostData[];
  freePosts: PostData[];
  strategyPosts: PostData[];
  handPosts: PostData[];
  hotPosts: PostData[];
}

/* ──────────────────────────────────────────────
 * Notice Banner
 * ────────────────────────────────────────────── */

function NoticeBanner({ notices }: { notices: PostData[] }) {
  if (notices.length === 0) return null;

  const latest = notices[0];

  return (
    <Link
      href={`/board/notice/${latest.id}`}
      className="flex items-center gap-3 bg-op-surface border border-op-border rounded-lg px-4 py-2.5 hover:bg-op-elevated transition-colors"
    >
      <span className="shrink-0 inline-flex items-center gap-1 rounded bg-op-gold-dim px-2 py-0.5 text-xs font-bold text-op-gold">
        <Megaphone className="w-3 h-3" />
        공지
      </span>
      <span className="flex-1 text-sm text-op-text truncate">
        {latest.title}
      </span>
      <ChevronRight className="w-4 h-4 shrink-0 text-op-text-muted" />
    </Link>
  );
}

/* ──────────────────────────────────────────────
 * News Hero Section
 * ────────────────────────────────────────────── */

function NewsHero({ items }: { items: NewsItem[] }) {
  if (items.length === 0) return null;

  const featured = items[0];
  const rest = items.slice(1, 4);

  return (
    <section>
      <SectionHeader title="뉴스" icon={<Newspaper className="w-4 h-4" />} href="/news" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mt-2">
        {/* Featured Card */}
        <a
          href={featured.link}
          target="_blank"
          rel="noopener noreferrer"
          className="lg:col-span-2 bg-op-surface border border-op-border rounded-lg p-4 hover:bg-op-elevated transition-colors group"
        >
          <div className="flex items-center gap-2 mb-2">
            <SourceBadge source={featured.source} />
            <span className="text-xs text-op-text-muted">
              {formatRelativeTime(featured.pubDate)}
            </span>
          </div>
          <h3 className="text-base font-semibold text-op-text group-hover:text-op-gold transition-colors line-clamp-2 mb-1.5">
            {featured.titleKo}
          </h3>
          <p className="text-sm text-op-text-secondary line-clamp-2">
            {featured.descriptionKo}
          </p>
        </a>

        {/* Side list */}
        <div className="flex flex-col gap-2">
          {rest.map((item) => (
            <a
              key={item.id}
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-op-surface border border-op-border rounded-lg px-3 py-2.5 hover:bg-op-elevated transition-colors group flex-1"
            >
              <div className="flex items-center gap-2 mb-1">
                <SourceBadge source={item.source} />
                <span className="text-xs text-op-text-muted">
                  {formatRelativeTime(item.pubDate)}
                </span>
              </div>
              <h4 className="text-sm text-op-text group-hover:text-op-gold transition-colors line-clamp-2">
                {item.titleKo}
              </h4>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

function SourceBadge({ source }: { source: string }) {
  const color = SOURCE_COLORS[source] || '#888';
  return (
    <span
      className="inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded"
      style={{ color, backgroundColor: `${color}18` }}
    >
      {source}
    </span>
  );
}

/* ──────────────────────────────────────────────
 * Board Preview Section
 * ────────────────────────────────────────────── */

function BoardPreview({
  title,
  posts,
  href,
  icon,
}: {
  title: string;
  posts: PostData[];
  href: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="bg-op-surface border border-op-border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-op-border">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-sm font-bold text-op-text">{title}</h2>
          {posts.length > 0 && (
            <span className="text-[10px] font-medium text-op-gold bg-op-gold-dim rounded-full px-1.5 py-0.5">
              {posts.length}
            </span>
          )}
        </div>
        <Link
          href={href}
          className="flex items-center gap-0.5 text-xs text-op-text-muted hover:text-op-gold transition-colors"
        >
          더 보기
          <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Post rows */}
      <div className="divide-y divide-op-border-subtle">
        {posts.length === 0 && (
          <div className="px-3 py-6 text-center text-sm text-op-text-muted">
            아직 게시글이 없습니다
          </div>
        )}
        {posts.map((post) => (
          <Link
            key={post.id}
            href={`/board/${post.boardSlug}/${post.id}`}
            className="flex items-center gap-2 px-3 py-1.5 hover:bg-op-elevated transition-colors"
          >
            {/* Title + comment count */}
            <span className="flex-1 text-sm text-op-text truncate">
              {post.title}
              {post.commentCount > 0 && (
                <span className="ml-1 text-xs text-op-gold font-medium">
                  [{post.commentCount}]
                </span>
              )}
            </span>

            {/* Author */}
            <span className="hidden sm:inline-block shrink-0 text-xs text-op-text-muted w-16 text-right truncate">
              {post.author}
            </span>

            {/* Date */}
            <span className="shrink-0 text-xs text-op-text-dim w-14 text-right">
              {formatRelativeTime(post.createdAt)}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────
 * Section Header (reusable)
 * ────────────────────────────────────────────── */

function SectionHeader({
  title,
  icon,
  href,
}: {
  title: string;
  icon?: React.ReactNode;
  href?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {icon && <span className="text-op-gold">{icon}</span>}
        <h2 className="text-sm font-bold text-op-text">{title}</h2>
      </div>
      {href && (
        <Link
          href={href}
          className="flex items-center gap-0.5 text-xs text-op-text-muted hover:text-op-gold transition-colors"
        >
          더 보기
          <ChevronRight className="w-3 h-3" />
        </Link>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────
 * Main Component
 * ────────────────────────────────────────────── */

export function HomeClient({
  newsItems,
  noticePosts,
  freePosts,
  strategyPosts,
  handPosts,
  hotPosts,
}: HomeClientProps) {
  return (
    <div className="space-y-4 pb-20 lg:pb-8">
      {/* Notice Banner */}
      <NoticeBanner notices={noticePosts} />

      {/* News Hero */}
      <NewsHero items={newsItems} />

      {/* Board Previews - 2 col grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BoardPreview
          title="자유게시판"
          posts={freePosts}
          href="/board/free"
        />
        <BoardPreview
          title="전략게시판"
          posts={strategyPosts}
          href="/board/strategy"
        />
        <BoardPreview
          title="핸드공유"
          posts={handPosts}
          href="/board/hands"
        />
        <BoardPreview
          title="HOT 인기글"
          posts={hotPosts}
          href="/board/free"
          icon={<Flame className="w-4 h-4 text-op-error" />}
        />
      </div>
    </div>
  );
}

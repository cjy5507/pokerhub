'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  BookOpen,
  Eye,
  Heart,
  MessageCircle,
  PenSquare,
  Trophy,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StrategyPost {
  id: string;
  title: string;
  content: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  createdAt: Date;
  author: {
    id: string;
    nickname: string;
    level: number;
    avatarUrl: string | null;
  };
  tags: string[];
}

interface PopularPost {
  id: string;
  title: string;
  likeCount: number;
  viewCount: number;
  commentCount: number;
  createdAt: Date;
  author: {
    id: string;
    nickname: string;
    level: number;
  };
}

interface StrategyClientProps {
  posts: StrategyPost[];
  popularPosts: PopularPost[];
  currentCategory: string;
  pagination: {
    page: number;
    total: number;
    totalPages: number;
  };
  isLoggedIn: boolean;
  boardSlug: string;
}

// ---------------------------------------------------------------------------
// Category definitions
// ---------------------------------------------------------------------------

const CATEGORIES = [
  { key: 'all', label: '전체' },
  { key: 'preflop', label: '프리플랍' },
  { key: 'postflop', label: '포스트플랍' },
  { key: 'tournament', label: '토너먼트' },
  { key: 'cash', label: '캐시게임' },
  { key: 'beginner', label: '초보자 가이드' },
] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').trim();
}

function formatDate(date: Date): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffHours < 1) return '방금 전';
  if (diffHours < 24) return `${diffHours}시간 전`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}일 전`;

  return d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

function formatNumber(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

// ---------------------------------------------------------------------------
// StrategyClient
// ---------------------------------------------------------------------------

export function StrategyClient({
  posts,
  popularPosts,
  currentCategory,
  pagination,
  isLoggedIn,
  boardSlug,
}: StrategyClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleCategoryChange(categoryKey: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (categoryKey === 'all') {
      params.delete('category');
    } else {
      params.set('category', categoryKey);
    }
    params.delete('page');
    router.push(`/strategy?${params.toString()}`);
  }

  function handlePageChange(page: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (page <= 1) {
      params.delete('page');
    } else {
      params.set('page', String(page));
    }
    router.push(`/strategy?${params.toString()}`);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 lg:py-8">
      {/* ----------------------------------------------------------------- */}
      {/* Hero Section */}
      {/* ----------------------------------------------------------------- */}
      <div className="mb-8 text-center lg:text-left">
        <div className="flex items-center justify-center lg:justify-start gap-3 mb-3">
          <div className="p-2.5 rounded-xl bg-ph-gold/10">
            <BookOpen className="w-7 h-7 text-ph-gold" />
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold text-ph-text">
            포커 전략 허브
          </h1>
        </div>
        <p className="text-ph-text-secondary text-sm lg:text-base max-w-2xl mx-auto lg:mx-0">
          프리플랍부터 리버까지, 초보자 가이드부터 고급 전략까지.
          커뮤니티의 검증된 전략 콘텐츠를 만나보세요.
        </p>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Category Tabs + Write Button */}
      {/* ----------------------------------------------------------------- */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex gap-1.5 overflow-x-auto pb-1 flex-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => handleCategoryChange(cat.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                currentCategory === cat.key
                  ? 'bg-ph-gold text-black'
                  : 'bg-ph-elevated text-ph-text-secondary hover:bg-ph-border hover:text-ph-text'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {isLoggedIn && (
          <Link
            href={`/board/${boardSlug}/write`}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-ph-gold hover:bg-ph-gold-hover text-black rounded-lg transition-colors font-medium text-sm shrink-0"
          >
            <PenSquare className="w-4 h-4" />
            전략글 작성
          </Link>
        )}
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Main Content: Grid + Sidebar */}
      {/* ----------------------------------------------------------------- */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Post Grid */}
        <div className="flex-1 min-w-0">
          {posts.length === 0 ? (
            <div className="bg-ph-surface border border-ph-border rounded-lg p-12 text-center">
              <BookOpen className="w-12 h-12 text-ph-text-muted mx-auto mb-4" />
              <p className="text-ph-text-secondary text-lg mb-2">
                {currentCategory !== 'all'
                  ? '해당 카테고리의 전략글이 없습니다'
                  : '아직 전략글이 없습니다'}
              </p>
              <p className="text-ph-text-muted text-sm mb-4">
                첫 번째 전략글의 주인공이 되어보세요!
              </p>
              {isLoggedIn && (
                <Link
                  href={`/board/${boardSlug}/write`}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-ph-gold hover:bg-ph-gold-hover text-black rounded-lg transition-colors font-medium text-sm"
                >
                  <PenSquare className="w-4 h-4" />
                  전략글 작성하기
                </Link>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {posts.map((post) => (
                  <StrategyCard
                    key={post.id}
                    post={post}
                    boardSlug={boardSlug}
                  />
                ))}
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="mt-8 flex items-center justify-center gap-2">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    className="p-2 rounded-lg bg-ph-elevated text-ph-text-secondary hover:bg-ph-border disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    aria-label="이전 페이지"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  {generatePageNumbers(pagination.page, pagination.totalPages).map(
                    (p, idx) =>
                      p === '...' ? (
                        <span
                          key={`ellipsis-${idx}`}
                          className="px-2 text-ph-text-muted"
                        >
                          ...
                        </span>
                      ) : (
                        <button
                          key={p}
                          onClick={() => handlePageChange(p as number)}
                          className={`min-w-[36px] h-9 rounded-lg text-sm font-medium transition-colors ${
                            p === pagination.page
                              ? 'bg-ph-gold text-black'
                              : 'bg-ph-elevated text-ph-text-secondary hover:bg-ph-border'
                          }`}
                        >
                          {p}
                        </button>
                      )
                  )}

                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages}
                    className="p-2 rounded-lg bg-ph-elevated text-ph-text-secondary hover:bg-ph-border disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    aria-label="다음 페이지"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Sidebar: Popular Posts */}
        <aside className="lg:w-80 shrink-0">
          <div className="bg-ph-surface border border-ph-border rounded-lg overflow-hidden sticky top-20">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-ph-border bg-ph-elevated">
              <Trophy className="w-4 h-4 text-ph-gold" />
              <h2 className="text-sm font-semibold text-ph-text">
                인기 전략글
              </h2>
            </div>

            {popularPosts.length === 0 ? (
              <div className="p-4 text-center text-sm text-ph-text-muted">
                아직 인기 전략글이 없습니다
              </div>
            ) : (
              <div className="divide-y divide-ph-border">
                {popularPosts.map((post, idx) => (
                  <Link
                    key={post.id}
                    href={`/board/${boardSlug}/${post.id}`}
                    className="flex gap-3 px-4 py-3 hover:bg-ph-elevated transition-colors group"
                  >
                    <span
                      className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        idx === 0
                          ? 'bg-ph-gold/20 text-ph-gold'
                          : idx === 1
                            ? 'bg-ph-silver/20 text-ph-silver'
                            : idx === 2
                              ? 'bg-ph-bronze/20 text-ph-bronze'
                              : 'bg-ph-border text-ph-text-muted'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-ph-text group-hover:text-ph-gold transition-colors line-clamp-1 font-medium">
                        {post.title}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-ph-text-muted">
                        <span>{post.author.nickname}</span>
                        <span className="flex items-center gap-0.5">
                          <Heart className="w-3 h-3" />
                          {post.likeCount}
                        </span>
                        <span className="flex items-center gap-0.5">
                          <Eye className="w-3 h-3" />
                          {formatNumber(post.viewCount)}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            <div className="px-4 py-3 border-t border-ph-border">
              <Link
                href={`/board/${boardSlug}`}
                className="flex items-center justify-center gap-1 text-xs text-ph-text-secondary hover:text-ph-gold transition-colors"
              >
                <TrendingUp className="w-3 h-3" />
                전략게시판 전체보기
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// StrategyCard
// ---------------------------------------------------------------------------

function StrategyCard({
  post,
  boardSlug,
}: {
  post: StrategyPost;
  boardSlug: string;
}) {
  const excerpt = stripHtml(post.content).slice(0, 150);

  return (
    <Link
      href={`/board/${boardSlug}/${post.id}`}
      className="block bg-ph-surface border border-ph-border rounded-lg hover:bg-ph-elevated hover:border-ph-gold/30 transition-all group"
    >
      <div className="p-4">
        {/* Tags */}
        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {post.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 rounded text-xs font-medium bg-ph-gold/10 text-ph-gold"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Title */}
        <h3 className="text-base font-semibold text-ph-text group-hover:text-ph-gold transition-colors line-clamp-2 mb-2">
          {post.title}
        </h3>

        {/* Excerpt */}
        <p className="text-sm text-ph-text-secondary line-clamp-3 mb-4 leading-relaxed">
          {excerpt || '내용 미리보기 없음'}
        </p>

        {/* Author + Stats */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-full bg-ph-border flex items-center justify-center text-xs font-bold text-ph-gold shrink-0 overflow-hidden">
              {post.author.avatarUrl ? (
                <img
                  src={post.author.avatarUrl}
                  alt={post.author.nickname}
                  className="w-full h-full object-cover"
                />
              ) : (
                post.author.nickname.charAt(0).toUpperCase()
              )}
            </div>
            <span className="text-xs text-ph-text-secondary truncate">
              {post.author.nickname}
            </span>
            <span className="text-xs text-ph-text-muted">
              Lv.{post.author.level}
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs text-ph-text-muted shrink-0">
            <span className="flex items-center gap-0.5">
              <Eye className="w-3 h-3" />
              {formatNumber(post.viewCount)}
            </span>
            <span className="flex items-center gap-0.5">
              <Heart className="w-3 h-3" />
              {post.likeCount}
            </span>
            <span className="flex items-center gap-0.5">
              <MessageCircle className="w-3 h-3" />
              {post.commentCount}
            </span>
          </div>
        </div>

        {/* Date */}
        <div className="mt-3 pt-3 border-t border-ph-border/50 text-xs text-ph-text-muted">
          {formatDate(post.createdAt)}
        </div>
      </div>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Pagination helper
// ---------------------------------------------------------------------------

function generatePageNumbers(
  current: number,
  total: number
): (number | '...')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | '...')[] = [1];

  if (current > 3) pages.push('...');

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (current < total - 2) pages.push('...');

  pages.push(total);

  return pages;
}

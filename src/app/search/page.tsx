import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '검색 | Open Poker',
  description: 'Open Poker에서 게시글과 핸드를 검색하세요.',
};

import { Suspense } from 'react';
import { Search as SearchIcon } from 'lucide-react';
import Link from 'next/link';
import { searchPosts } from './actions';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

interface SearchPageProps {
  searchParams: Promise<{
    q?: string;
  }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const query = params.q || '';

  const results = await searchPosts(query);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 pb-20 lg:pb-0">
      {/* Search Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-op-text mb-4">검색</h1>

        {/* Search Form */}
        <form action="/search" method="GET" className="mb-6">
          <div className="relative">
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="게시글 검색..."
              className="w-full px-4 py-3 pl-12 bg-op-surface border border-op-border rounded-lg text-op-text placeholder:text-op-text-muted focus:outline-none focus:ring-2 focus:ring-op-info focus:border-transparent"
              autoFocus
            />
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-op-text-muted" />
          </div>
        </form>

        {/* Results Count */}
        {query && (
          <div className="text-sm text-op-text-secondary">
            &quot;{query}&quot; 검색 결과: <span className="text-op-text font-medium">{results.length}</span>건
          </div>
        )}
      </div>

      {/* Search Results */}
      <div className="bg-op-surface rounded-lg overflow-hidden">
        {!query ? (
          <div className="py-16 text-center text-op-text-muted">
            검색어를 입력해주세요
          </div>
        ) : results.length === 0 ? (
          <div className="py-16 text-center text-op-text-muted">
            검색 결과가 없습니다
          </div>
        ) : (
          <div className="divide-y divide-op-border">
            {results.map((result) => {
              // Parse date and calculate time ago
              const date = new Date(result.date);
              const timeAgo = formatDistanceToNow(date, { addSuffix: true, locale: ko });

              return (
                <Link
                  key={result.id}
                  href={`/board/${result.boardSlug}/${result.id}`}
                  className="block p-4 hover:bg-op-elevated transition-colors"
                >
                  <h3 className="text-op-text font-medium mb-2 line-clamp-2">
                    {result.title}
                  </h3>
                  {result.content && (
                    <p className="text-sm text-op-text-secondary mb-3 line-clamp-2">
                      {result.content}
                    </p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-op-text-muted">
                    <span className="text-op-info">{result.board}</span>
                    <span>·</span>
                    <span>{result.author}</span>
                    <span>·</span>
                    <span>{timeAgo}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

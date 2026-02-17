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
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Search Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#e0e0e0] mb-4">검색</h1>

        {/* Search Form */}
        <form action="/search" method="GET" className="mb-6">
          <div className="relative">
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="게시글 검색..."
              className="w-full px-4 py-3 pl-12 bg-[#1e1e1e] border border-[#333] rounded-lg text-[#e0e0e0] placeholder:text-[#888] focus:outline-none focus:ring-2 focus:ring-[#3b82f6] focus:border-transparent"
              autoFocus
            />
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#888]" />
          </div>
        </form>

        {/* Results Count */}
        {query && (
          <div className="text-sm text-[#a0a0a0]">
            &quot;{query}&quot; 검색 결과: <span className="text-[#e0e0e0] font-medium">{results.length}</span>건
          </div>
        )}
      </div>

      {/* Search Results */}
      <div className="bg-[#1a1a1a] rounded-lg overflow-hidden">
        {!query ? (
          <div className="py-16 text-center text-[#888]">
            검색어를 입력해주세요
          </div>
        ) : results.length === 0 ? (
          <div className="py-16 text-center text-[#888]">
            검색 결과가 없습니다
          </div>
        ) : (
          <div className="divide-y divide-[#333]">
            {results.map((result) => {
              // Parse date and calculate time ago
              const date = new Date(result.date);
              const timeAgo = formatDistanceToNow(date, { addSuffix: true, locale: ko });

              return (
                <Link
                  key={result.id}
                  href={`/board/${result.boardSlug}/${result.id}`}
                  className="block p-4 hover:bg-[#2a2a2a] transition-colors"
                >
                  <h3 className="text-[#e0e0e0] font-medium mb-2 line-clamp-2">
                    {result.title}
                  </h3>
                  {result.content && (
                    <p className="text-sm text-[#a0a0a0] mb-3 line-clamp-2">
                      {result.content}
                    </p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-[#888]">
                    <span className="text-[#3b82f6]">{result.board}</span>
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

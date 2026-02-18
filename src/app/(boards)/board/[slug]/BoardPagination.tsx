'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface BoardPaginationProps {
  boardSlug: string;
  currentPage: number;
  totalPages: number;
  sort?: string;
  search?: string;
  target?: string;
}

export function BoardPagination({
  boardSlug,
  currentPage,
  totalPages,
  sort,
  search,
  target,
}: BoardPaginationProps) {
  const buildUrl = (page: number) => {
    const params = new URLSearchParams();
    params.set('page', page.toString());
    if (sort) params.set('sort', sort);
    if (search) {
      params.set('search', search);
      if (target) params.set('target', target);
    }
    return `/board/${boardSlug}?${params.toString()}`;
  };

  // Calculate page range to display (max 10 pages)
  const maxPagesToShow = 10;
  let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
  const endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

  if (endPage - startPage + 1 < maxPagesToShow) {
    startPage = Math.max(1, endPage - maxPagesToShow + 1);
  }

  const pages = Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);

  return (
    <div className="flex items-center justify-center gap-2">
      {/* Previous button */}
      {currentPage > 1 ? (
        <Link
          href={buildUrl(currentPage - 1)}
          className="flex items-center justify-center w-10 h-10 rounded-lg bg-op-elevated text-op-text hover:bg-op-border transition-colors min-h-[44px] min-w-[44px]"
          aria-label="이전 페이지"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
      ) : (
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-op-surface text-op-text-muted min-h-[44px] min-w-[44px]">
          <ChevronLeft className="w-5 h-5" />
        </div>
      )}

      {/* Page numbers */}
      {pages.map((page) => (
        <Link
          key={page}
          href={buildUrl(page)}
          className={cn(
            'flex items-center justify-center w-10 h-10 rounded-lg font-medium text-sm transition-colors min-h-[44px] min-w-[44px]',
            page === currentPage
              ? 'bg-op-info text-white'
              : 'bg-op-elevated text-op-text hover:bg-op-border'
          )}
          aria-label={`${page}페이지`}
          aria-current={page === currentPage ? 'page' : undefined}
        >
          {page}
        </Link>
      ))}

      {/* Next button */}
      {currentPage < totalPages ? (
        <Link
          href={buildUrl(currentPage + 1)}
          className="flex items-center justify-center w-10 h-10 rounded-lg bg-op-elevated text-op-text hover:bg-op-border transition-colors min-h-[44px] min-w-[44px]"
          aria-label="다음 페이지"
        >
          <ChevronRight className="w-5 h-5" />
        </Link>
      ) : (
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-op-surface text-op-text-muted min-h-[44px] min-w-[44px]">
          <ChevronRight className="w-5 h-5" />
        </div>
      )}
    </div>
  );
}

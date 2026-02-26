import Link from 'next/link';
import { cn } from '@/lib/utils';

interface BoardSortTabsProps {
  currentSort: string;
  boardSlug: string;
  currentSearch?: string;
  currentTarget?: string;
}

const SORT_OPTIONS = [
  { value: 'latest', label: '최신순' },
  { value: 'popular', label: '인기순' },
  { value: 'comments', label: '댓글순' },
  { value: 'views', label: '조회순' },
] as const;

export function BoardSortTabs({ currentSort, boardSlug, currentSearch, currentTarget }: BoardSortTabsProps) {
  const buildSortUrl = (sort: string) => {
    const params = new URLSearchParams({ sort });
    if (currentSearch) {
      params.set('search', currentSearch);
      if (currentTarget) params.set('target', currentTarget);
    }
    return `/board/${boardSlug}?${params.toString()}`;
  };

  return (
    <div className="flex gap-2 overflow-x-auto">
      {SORT_OPTIONS.map((option) => (
        <Link
          key={option.value}
          href={buildSortUrl(option.value)}
          className={cn(
            'px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors min-h-[44px]',
            currentSort === option.value
              ? 'bg-op-info text-white'
              : 'bg-op-elevated text-op-text-secondary hover:bg-op-border'
          )}
        >
          {option.label}
        </Link>
      ))}
    </div>
  );
}

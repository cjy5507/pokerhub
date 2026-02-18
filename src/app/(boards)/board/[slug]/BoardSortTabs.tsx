'use client';

import { cn } from '@/lib/utils';
import { useRouter, useSearchParams } from 'next/navigation';

interface BoardSortTabsProps {
  currentSort: string;
  boardSlug: string;
}

const SORT_OPTIONS = [
  { value: 'latest', label: '최신순' },
  { value: 'popular', label: '인기순' },
  { value: 'comments', label: '댓글순' },
  { value: 'views', label: '조회순' },
] as const;

export function BoardSortTabs({ currentSort, boardSlug }: BoardSortTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSortChange = (sort: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('sort', sort);
    params.delete('page'); // Reset to page 1 when sorting changes
    router.push(`/board/${boardSlug}?${params.toString()}`);
  };

  return (
    <div className="flex gap-2 overflow-x-auto">
      {SORT_OPTIONS.map((option) => (
        <button
          key={option.value}
          onClick={() => handleSortChange(option.value)}
          className={cn(
            'px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors min-h-[44px]',
            currentSort === option.value
              ? 'bg-op-info text-white'
              : 'bg-op-elevated text-op-text-secondary hover:bg-op-border'
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';

interface BoardSearchFormProps {
  boardSlug: string;
  currentSearch?: string;
  currentTarget?: 'title' | 'content' | 'author' | 'title_content';
}

export function BoardSearchForm({ boardSlug, currentSearch, currentTarget }: BoardSearchFormProps) {
  const router = useRouter();
  const [search, setSearch] = useState(currentSearch || '');
  const [target, setTarget] = useState<'title' | 'content' | 'title_content' | 'author'>(
    currentTarget || 'title_content'
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const params = new URLSearchParams();
    if (search.trim()) {
      params.set('search', search.trim());
      params.set('target', target);
    }
    params.set('page', '1');

    const url = `/board/${boardSlug}${params.toString() ? `?${params.toString()}` : ''}`;
    router.push(url);
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 flex-1 max-w-md">
      {/* Target dropdown */}
      <select
        value={target}
        onChange={(e) => setTarget(e.target.value as typeof target)}
        className="px-3 py-2 bg-[#1e1e1e] border border-[#333] text-[#e0e0e0] rounded-lg focus:outline-none focus:border-[#c9a227] min-h-[44px]"
      >
        <option value="title">제목</option>
        <option value="content">내용</option>
        <option value="title_content">제목+내용</option>
        <option value="author">작성자</option>
      </select>

      {/* Search input */}
      <div className="flex-1 relative">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="검색어를 입력하세요"
          className="w-full px-4 py-2 pr-10 bg-[#1e1e1e] border border-[#333] text-[#e0e0e0] placeholder:text-[#888] rounded-lg focus:outline-none focus:border-[#c9a227] min-h-[44px]"
        />
        <button
          type="submit"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-[#a0a0a0] hover:text-[#c9a227] transition-colors p-2"
          aria-label="검색"
        >
          <Search className="w-5 h-5" />
        </button>
      </div>
    </form>
  );
}

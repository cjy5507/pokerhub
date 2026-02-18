'use client';

import { useState, useEffect, useTransition } from 'react';
import { getAdminPosts, deleteAdminPost } from '../actions';
import { Search, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';

type Post = {
  id: string;
  title: string;
  status: 'published' | 'draft' | 'hidden' | 'deleted';
  viewCount: number;
  likeCount: number;
  commentCount: number;
  createdAt: Date;
  authorNickname: string | null;
  boardName: string | null;
};

export default function AdminPostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [isPending, startTransition] = useTransition();

  const fetchPosts = (p: number, s?: string) => {
    startTransition(async () => {
      const data = await getAdminPosts(p, 20, s || undefined);
      setPosts(data.posts as Post[]);
      setTotalPages(data.pagination.totalPages);
      setTotal(data.pagination.total);
    });
  };

  useEffect(() => {
    fetchPosts(page, search);
  }, [page, search]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  };

  const handleDelete = (postId: string) => {
    if (!confirm('이 게시글을 삭제하시겠습니까?')) return;
    startTransition(async () => {
      try {
        await deleteAdminPost(postId);
        fetchPosts(page, search);
      } catch (err: any) {
        alert(err.message);
      }
    });
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case 'published': return { text: '게시됨', cls: 'bg-green-500/20 text-green-400' };
      case 'draft': return { text: '임시저장', cls: 'bg-blue-500/20 text-blue-400' };
      case 'hidden': return { text: '숨김', cls: 'bg-yellow-500/20 text-yellow-400' };
      case 'deleted': return { text: '삭제됨', cls: 'bg-red-500/20 text-red-400' };
      default: return { text: status, cls: 'bg-[#333] text-[#888]' };
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-[#c9a227]">게시글 관리</h2>
        <p className="text-sm text-[#888]">총 {total.toLocaleString()}건</p>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#888]" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="제목 검색..."
            className="w-full rounded-lg border border-[#333] bg-[#1e1e1e] py-2 pl-10 pr-4 text-sm text-[#e0e0e0] placeholder-[#666] focus:border-[#c9a227] focus:outline-none"
          />
        </div>
        <button
          type="submit"
          className="rounded-lg bg-[#c9a227] px-4 py-2 text-sm font-medium text-black hover:bg-[#d4af37] transition-colors"
        >
          검색
        </button>
      </form>

      {/* Posts table */}
      <div className="rounded-xl bg-[#1e1e1e] border border-[#333] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#333] text-left text-[#888]">
                <th className="px-4 py-3">게시판</th>
                <th className="px-4 py-3">제목</th>
                <th className="px-4 py-3">작성자</th>
                <th className="px-4 py-3">상태</th>
                <th className="px-4 py-3 text-right">조회</th>
                <th className="px-4 py-3 text-right">좋아요</th>
                <th className="px-4 py-3 text-right">댓글</th>
                <th className="px-4 py-3">작성일</th>
                <th className="px-4 py-3">관리</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => {
                const status = statusLabel(post.status);
                return (
                  <tr key={post.id} className="border-b border-[#333]/50 hover:bg-[#333]/30">
                    <td className="px-4 py-3 text-[#888]">{post.boardName || '-'}</td>
                    <td className="px-4 py-3 font-medium max-w-[200px] truncate">{post.title}</td>
                    <td className="px-4 py-3 text-[#888]">{post.authorNickname || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${status.cls}`}>
                        {status.text}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-[#888]">{post.viewCount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-[#888]">{post.likeCount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-[#888]">{post.commentCount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-[#888]">
                      {new Date(post.createdAt).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="px-4 py-3">
                      {post.status !== 'deleted' && (
                        <button
                          onClick={() => handleDelete(post.id)}
                          disabled={isPending}
                          title="삭제"
                          className="rounded p-1.5 text-[#888] hover:bg-red-500/20 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {posts.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-[#888]">
                    {isPending ? '로딩 중...' : '게시글이 없습니다'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || isPending}
            className="rounded-lg border border-[#333] p-2 text-[#888] hover:bg-[#333] hover:text-[#e0e0e0] disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm text-[#888]">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages || isPending}
            className="rounded-lg border border-[#333] p-2 text-[#888] hover:bg-[#333] hover:text-[#e0e0e0] disabled:opacity-30 transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { getBoard, getBoards, getPosts } from '@/lib/queries/boards';
import { getSession } from '@/lib/auth/session';
import { PostRow } from '@/components/board/PostRow';
import { Search, PenSquare } from 'lucide-react';
import Link from 'next/link';
import { BoardSortTabs } from './BoardSortTabs';
import { BoardSearchForm } from './BoardSearchForm';
import { BoardPagination } from './BoardPagination';

interface BoardPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    page?: string;
    sort?: string;
    search?: string;
    target?: string;
  }>;
}

export default async function BoardPage({ params, searchParams }: BoardPageProps) {
  const { slug } = await params;
  const search = await searchParams;

  // Get board info
  const board = await getBoard(slug);
  if (!board) {
    // Check if this is a DB connection issue
    const boards = await getBoards();
    if (boards.length === 0) {
      // Likely a DB connection issue
      return (
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="bg-op-surface rounded-lg p-8 text-center">
            <h1 className="text-2xl font-bold text-op-text mb-4">데이터베이스 연결 필요</h1>
            <p className="text-op-text-secondary mb-2">
              게시판을 불러올 수 없습니다. 데이터베이스 연결을 확인해주세요.
            </p>
            <p className="text-sm text-op-text-muted">
              .env 파일에 DATABASE_URL이 올바르게 설정되어 있는지 확인하세요.
            </p>
          </div>
        </div>
      );
    }
    // Board truly doesn't exist
    notFound();
  }

  // Get current session
  const session = await getSession();

  // Parse query params
  const page = parseInt(search.page || '1', 10);
  const sort = (search.sort || 'latest') as 'latest' | 'popular' | 'comments' | 'views';
  const searchQuery = search.search;
  const searchTarget = search.target as 'title' | 'content' | 'title_content' | 'author' | undefined;

  // Fetch posts
  const { posts, pagination } = await getPosts({
    boardSlug: slug,
    page,
    limit: 20,
    sort,
    search: searchQuery,
    searchTarget,
    userId: session?.userId,
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 pb-20 lg:pb-0">
      {/* Board Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-op-text mb-2">{board.nameKo}</h1>
        {board.description && (
          <p className="text-sm text-op-text-secondary">{board.description}</p>
        )}
        <div className="mt-2 text-sm text-op-text-muted">
          전체 게시글 <span className="text-op-text font-medium">{pagination.total}</span>개
        </div>
      </div>

      {/* Controls: Sort + Search + Write Button */}
      <div className="mb-4 flex flex-col lg:flex-row lg:items-center gap-4">
        {/* Sort tabs */}
        <BoardSortTabs currentSort={sort} boardSlug={slug} />

        {/* Spacer */}
        <div className="flex-1" />

        {/* Search form */}
        <BoardSearchForm
          boardSlug={slug}
          currentSearch={searchQuery}
          currentTarget={searchTarget}
        />

        {/* Write button: hide for non-admins on notice board */}
        {session && (board.slug !== 'notice' || session.role === 'admin') && (
          <Link
            href={`/board/${slug}/write`}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-op-info hover:bg-op-info text-white rounded-lg transition-colors font-medium min-h-[44px]"
          >
            <PenSquare className="w-5 h-5" />
            <span className="hidden sm:inline">글쓰기</span>
          </Link>
        )}
      </div>

      {/* Post List */}
      <div className="bg-op-surface rounded-lg overflow-hidden">
        {/* Desktop: Table header */}
        <div className="hidden lg:grid lg:grid-cols-[auto_1fr_150px_100px_80px_80px] gap-4 items-center px-4 py-3 border-b border-op-border bg-op-elevated">
          <div className="w-6"></div>
          <div className="text-sm font-medium text-op-text-secondary">제목</div>
          <div className="text-sm font-medium text-op-text-secondary">작성자</div>
          <div className="text-sm font-medium text-op-text-secondary">날짜</div>
          <div className="text-sm font-medium text-op-text-secondary">조회</div>
          <div className="text-sm font-medium text-op-text-secondary">좋아요</div>
        </div>

        {/* Posts */}
        {posts.length === 0 ? (
          <div className="py-16 text-center text-op-text-muted">
            {searchQuery ? '검색 결과가 없습니다' : '게시글이 없습니다'}
          </div>
        ) : (
          <div className="lg:divide-y lg:divide-op-border flex flex-col gap-3 lg:gap-0 p-3 lg:p-0">
            {posts.map((post: any) => (
              <PostRow
                key={post.id}
                postId={post.id}
                boardSlug={slug}
                title={post.title}
                author={{
                  userId: post.author?.id || '',
                  nickname: post.author?.nickname || '알 수 없음',
                  level: post.author?.level || 1,
                }}
                createdAt={post.createdAt}
                views={post.viewCount}
                likes={post.likeCount}
                commentCount={post.commentCount}
                isPinned={post.isPinned}
              />
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="mt-6">
          <BoardPagination
            boardSlug={slug}
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            sort={sort}
            search={searchQuery}
            target={searchTarget}
          />
        </div>
      )}
    </div>
  );
}

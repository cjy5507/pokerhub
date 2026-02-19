import { notFound } from 'next/navigation';
import DOMPurify from 'isomorphic-dompurify';
import { getPost, getComments, getRelatedPosts, getBoards } from '@/lib/queries/boards';
import { getSession } from '@/lib/auth/session';
import { incrementViewCount } from '@/app/(boards)/actions';
import { AuthorBadge } from '@/components/user/AuthorBadge';
import { Eye, Bookmark, Share2, Flag } from 'lucide-react';
import Link from 'next/link';
import { PostActions } from './PostActions';
import { CommentSection } from './CommentSection';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

interface PostPageProps {
  params: Promise<{ slug: string; postId: string }>;
}

export default async function PostPage({ params }: PostPageProps) {
  const { slug, postId } = await params;

  // Get current session
  const session = await getSession();

  // Fetch post data
  const post = await getPost(postId, session?.userId);
  if (!post) {
    // Check if this is a DB connection issue
    const boards = await getBoards();
    if (boards.length === 0) {
      // Likely a DB connection issue
      return (
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <div className="bg-op-surface rounded-lg p-8 border border-op-border">
            <h2 className="text-xl font-bold text-op-text mb-4">데이터베이스 연결 필요</h2>
            <p className="text-op-text-secondary mb-2">데이터를 불러올 수 없습니다.</p>
            <p className="text-sm text-op-text-dim">.env 파일의 DATABASE_URL 설정을 확인해주세요.</p>
          </div>
        </div>
      );
    }
    // Post truly doesn't exist
    notFound();
  }

  // Increment view count (fire and forget)
  incrementViewCount(postId);

  // Fetch comments and related posts in parallel
  const [comments, relatedPosts] = await Promise.all([
    getComments(postId, session?.userId),
    getRelatedPosts(postId, post.boardId),
  ]);

  const timeAgo = formatDistanceToNow(post.createdAt, { addSuffix: true, locale: ko });

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 pb-20 lg:pb-0">
      {/* Board breadcrumb */}
      <div className="mb-4">
        <Link
          href={`/board/${slug}`}
          className="text-sm text-op-info hover:underline"
        >
          ← {post.board?.nameKo || '게시판'}
        </Link>
      </div>

      {/* Post container */}
      <div className="bg-op-surface rounded-lg overflow-hidden">
        {/* Post header */}
        <div className="p-4 sm:p-6 border-b border-op-border">
          <h1 className="text-xl sm:text-2xl font-bold text-op-text mb-4">{post.title}</h1>

          <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-sm">
            <AuthorBadge
              userId={post.author?.id || ''}
              nickname={post.author?.nickname || '알 수 없음'}
              level={post.author?.level || 1}
            />
            {post.author?.customTitle && (
              <span className="text-xs text-op-gold font-medium">
                {post.author.customTitle}
              </span>
            )}
            <span className="text-op-text-muted">·</span>
            <span className="text-op-text-secondary">{timeAgo}</span>
            <span className="text-op-text-muted">·</span>
            <div className="flex items-center gap-1 text-op-text-secondary">
              <Eye className="w-4 h-4" />
              <span>{post.viewCount}</span>
            </div>
          </div>
        </div>

        {/* Post content */}
        <div className="p-4 sm:p-6 border-b border-op-border">
          {post.contentHtml ? (
            <div
              className="prose dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.contentHtml) }}
            />
          ) : (
            <div className="whitespace-pre-wrap text-op-text">{post.content}</div>
          )}
        </div>

        {/* Post actions */}
        <PostActions
          postId={postId}
          boardSlug={slug}
          initialLikes={post.likeCount}
          initialIsLiked={post.isLiked}
          initialIsBookmarked={post.isBookmarked}
          isOwner={session?.userId === post.author?.id}
        />
      </div>

      {/* Comment section */}
      <div className="mt-6">
        <CommentSection
          postId={postId}
          comments={comments}
          currentUserId={session?.userId}
        />
      </div>

      {/* Related posts */}
      {relatedPosts.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-bold text-op-text mb-4">관련 게시글</h2>
          <div className="bg-op-surface rounded-lg divide-y divide-op-border">
            {relatedPosts.map((relatedPost: any) => (
              <Link
                key={relatedPost.id}
                href={`/board/${slug}/${relatedPost.id}`}
                className="block p-4 hover:bg-op-elevated transition-colors"
              >
                <h3 className="text-op-text font-medium mb-2 line-clamp-1">
                  {relatedPost.title}
                </h3>
                <div className="flex items-center gap-3 text-xs text-op-text-secondary">
                  <span>조회 {relatedPost.viewCount}</span>
                  <span>좋아요 {relatedPost.likeCount}</span>
                  <span>댓글 {relatedPost.commentCount}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

import { db } from '@/lib/db';
import { boards, posts, comments, users, postLikes, bookmarks, commentLikes } from '@/lib/db/schema';
import { eq, and, or, desc, asc, sql, ilike, count } from 'drizzle-orm';
import type { GetPostsInput } from '@/lib/validations/board';

// ==================== BOARD QUERIES ====================

/**
 * Get board by slug
 */
export async function getBoard(slug: string) {
  if (!db) return null;
  const board = await db.query.boards.findFirst({
    where: eq(boards.slug, slug),
  });

  return board;
}

/**
 * Get all active boards
 */
export async function getBoards() {
  if (!db) return [];
  return db.query.boards.findMany({
    where: eq(boards.isActive, true),
    orderBy: [asc(boards.sortOrder), asc(boards.nameKo)],
  });
}

// ==================== POST QUERIES ====================

/**
 * Get posts for a board with pagination, sorting, and search
 */
export async function getPosts(input: GetPostsInput & { userId?: string }) {
  if (!db) return { posts: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };
  const { boardSlug, page, limit, sort, search, searchTarget, userId } = input;

  // Get board first
  const board = await getBoard(boardSlug);
  if (!board) {
    throw new Error('게시판을 찾을 수 없습니다');
  }

  // Build where conditions
  const conditions = [
    eq(posts.boardId, board.id),
    eq(posts.status, 'published'),
  ];

  // Add search conditions
  if (search && searchTarget) {
    switch (searchTarget) {
      case 'title':
        conditions.push(ilike(posts.title, `%${search}%`));
        break;
      case 'content':
        conditions.push(ilike(posts.content, `%${search}%`));
        break;
      case 'title_content':
        conditions.push(
          or(
            ilike(posts.title, `%${search}%`),
            ilike(posts.content, `%${search}%`)
          )!
        );
        break;
      case 'author':
        conditions.push(ilike(users.nickname, `%${search}%`));
        break;
    }
  }

  // Build order by
  let orderBy;
  switch (sort) {
    case 'popular':
      orderBy = [desc(posts.likeCount), desc(posts.createdAt)];
      break;
    case 'comments':
      orderBy = [desc(posts.commentCount), desc(posts.createdAt)];
      break;
    case 'views':
      orderBy = [desc(posts.viewCount), desc(posts.createdAt)];
      break;
    case 'latest':
    default:
      orderBy = [desc(posts.isPinned), desc(posts.createdAt)];
      break;
  }

  const offset = (page - 1) * limit;

  // Get posts with author info
  const postsData = await db
    .select({
      id: posts.id,
      boardId: posts.boardId,
      title: posts.title,
      status: posts.status,
      isPinned: posts.isPinned,
      isFeatured: posts.isFeatured,
      viewCount: posts.viewCount,
      likeCount: posts.likeCount,
      commentCount: posts.commentCount,
      createdAt: posts.createdAt,
      author: {
        id: users.id,
        nickname: users.nickname,
        avatarUrl: users.avatarUrl,
        level: users.level,
      },
      isLiked: userId
        ? sql<boolean>`EXISTS(SELECT 1 FROM ${postLikes} WHERE ${postLikes.postId} = ${posts.id} AND ${postLikes.userId} = ${userId})`
        : sql<boolean>`false`,
      isBookmarked: userId
        ? sql<boolean>`EXISTS(SELECT 1 FROM ${bookmarks} WHERE ${bookmarks.postId} = ${posts.id} AND ${bookmarks.userId} = ${userId})`
        : sql<boolean>`false`,
    })
    .from(posts)
    .leftJoin(users, eq(posts.authorId, users.id))
    .where(and(...conditions))
    .orderBy(...orderBy)
    .limit(limit)
    .offset(offset);

  // Get total count
  const [{ count: totalCount }] = await db
    .select({ count: count() })
    .from(posts)
    .where(and(...conditions));

  return {
    posts: postsData,
    pagination: {
      page,
      limit,
      total: totalCount,
      totalPages: Math.ceil(totalCount / limit),
    },
  };
}

/**
 * Get single post by ID with full details
 */
export async function getPost(postId: string, userId?: string) {
  if (!db) return null;
  const post = await db
    .select({
      id: posts.id,
      boardId: posts.boardId,
      title: posts.title,
      content: posts.content,
      contentHtml: posts.contentHtml,
      status: posts.status,
      isPinned: posts.isPinned,
      isFeatured: posts.isFeatured,
      viewCount: posts.viewCount,
      likeCount: posts.likeCount,
      commentCount: posts.commentCount,
      bookmarkCount: posts.bookmarkCount,
      createdAt: posts.createdAt,
      updatedAt: posts.updatedAt,
      author: {
        id: users.id,
        nickname: users.nickname,
        avatarUrl: users.avatarUrl,
        level: users.level,
        customTitle: users.customTitle,
      },
      board: {
        id: boards.id,
        slug: boards.slug,
        nameKo: boards.nameKo,
      },
      isLiked: userId
        ? sql<boolean>`EXISTS(SELECT 1 FROM ${postLikes} WHERE ${postLikes.postId} = ${posts.id} AND ${postLikes.userId} = ${userId})`
        : sql<boolean>`false`,
      isBookmarked: userId
        ? sql<boolean>`EXISTS(SELECT 1 FROM ${bookmarks} WHERE ${bookmarks.postId} = ${posts.id} AND ${bookmarks.userId} = ${userId})`
        : sql<boolean>`false`,
    })
    .from(posts)
    .leftJoin(users, eq(posts.authorId, users.id))
    .leftJoin(boards, eq(posts.boardId, boards.id))
    .where(eq(posts.id, postId))
    .limit(1);

  return post[0] || null;
}

/**
 * Get related posts (same board, exclude current)
 */
export async function getRelatedPosts(postId: string, boardId: string, limit = 5) {
  if (!db) return [];
  return db
    .select({
      id: posts.id,
      title: posts.title,
      viewCount: posts.viewCount,
      likeCount: posts.likeCount,
      commentCount: posts.commentCount,
      createdAt: posts.createdAt,
    })
    .from(posts)
    .where(
      and(
        eq(posts.boardId, boardId),
        eq(posts.status, 'published'),
        sql`${posts.id} != ${postId}`
      )
    )
    .orderBy(desc(posts.createdAt))
    .limit(limit);
}

// ==================== COMMENT QUERIES ====================

/**
 * Get comments for a post with nested replies
 */
export async function getComments(postId: string, userId?: string) {
  if (!db) return [];
  const allComments = await db
    .select({
      id: comments.id,
      postId: comments.postId,
      parentId: comments.parentId,
      content: comments.content,
      likeCount: comments.likeCount,
      status: comments.status,
      createdAt: comments.createdAt,
      author: {
        id: users.id,
        nickname: users.nickname,
        avatarUrl: users.avatarUrl,
        level: users.level,
      },
      isLiked: userId
        ? sql<boolean>`EXISTS(SELECT 1 FROM ${commentLikes} WHERE ${commentLikes.commentId} = ${comments.id} AND ${commentLikes.userId} = ${userId})`
        : sql<boolean>`false`,
    })
    .from(comments)
    .leftJoin(users, eq(comments.authorId, users.id))
    .where(
      and(
        eq(comments.postId, postId),
        eq(comments.status, 'published')
      )
    )
    .orderBy(asc(comments.createdAt));

  // Organize into parent and replies
  const parentComments = allComments.filter((c: any) => !c.parentId);
  const replies = allComments.filter((c: any) => c.parentId);

  // Attach replies to parents
  const commentsWithReplies = parentComments.map((parent: any) => ({
    id: parent.id as string,
    postId: parent.postId as string,
    parentId: parent.parentId as string | null,
    content: parent.content as string,
    likeCount: parent.likeCount as number,
    status: parent.status as string,
    createdAt: parent.createdAt as Date,
    author: parent.author,
    isLiked: parent.isLiked,
    replies: replies.filter((r: any) => r.parentId === parent.id).map((r: any) => ({
      id: r.id as string,
      postId: r.postId as string,
      parentId: r.parentId as string | null,
      content: r.content as string,
      likeCount: r.likeCount as number,
      status: r.status as string,
      createdAt: r.createdAt as Date,
      author: r.author,
      isLiked: r.isLiked,
    })),
  }));

  return commentsWithReplies;
}

/**
 * Check if user owns a post
 */
export async function isPostOwner(postId: string, userId: string): Promise<boolean> {
  if (!db) return false;
  const post = await db.query.posts.findFirst({
    where: eq(posts.id, postId),
    columns: { authorId: true },
  });

  return post?.authorId === userId;
}

/**
 * Check if user owns a comment
 */
export async function isCommentOwner(commentId: string, userId: string): Promise<boolean> {
  if (!db) return false;
  const comment = await db.query.comments.findFirst({
    where: eq(comments.id, commentId),
    columns: { authorId: true },
  });

  return comment?.authorId === userId;
}

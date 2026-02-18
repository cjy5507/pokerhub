'use server';

import { revalidatePath } from 'next/cache';
import DOMPurify from 'isomorphic-dompurify';
import { db } from '@/lib/db';
import {
  posts,
  comments,
  postLikes,
  commentLikes,
  bookmarks,
  reports,
  boards,
  xpTransactions,
  pointTransactions,
  users,
} from '@/lib/db/schema';
import { getSession } from '@/lib/auth/session';
import { eq, and, sql } from 'drizzle-orm';
import {
  createPostSchema,
  updatePostSchema,
  deletePostSchema,
  createCommentSchema,
  togglePostLikeSchema,
  toggleBookmarkSchema,
  toggleCommentLikeSchema,
  reportPostSchema,
  type CreatePostInput,
  type UpdatePostInput,
  type DeletePostInput,
  type CreateCommentInput,
  type TogglePostLikeInput,
  type ToggleBookmarkInput,
  type ToggleCommentLikeInput,
  type ReportPostInput,
} from '@/lib/validations/board';
import { isPostOwner, isCommentOwner } from '@/lib/queries/boards';

// ==================== HELPER FUNCTIONS ====================

async function requireAuth() {
  const session = await getSession();
  if (!session) {
    throw new Error('로그인이 필요합니다');
  }
  return session;
}

async function awardXP(userId: string, amount: number, type: string, referenceId?: string) {
  if (!db) return;
  try {
    // Add XP transaction
    await db.insert(xpTransactions).values({
      userId,
      amount,
      type: type as any,
      referenceId,
    });

    // Update user XP
    await db
      .update(users)
      .set({
        xp: sql`${users.xp} + ${amount}`,
      })
      .where(eq(users.id, userId));
  } catch (error) {
    console.error('Failed to award XP:', error);
  }
}

async function awardPoints(userId: string, amount: number, type: string, referenceId?: string, description?: string) {
  if (!db) return;
  try {
    // Get current balance
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { points: true },
    });

    if (!user) return;

    const newBalance = user.points + amount;

    // Add points transaction
    await db.insert(pointTransactions).values({
      userId,
      amount,
      balanceAfter: newBalance,
      type: type as any,
      referenceId,
      description,
    });

    // Update user points
    await db
      .update(users)
      .set({
        points: newBalance,
      })
      .where(eq(users.id, userId));
  } catch (error) {
    console.error('Failed to award points:', error);
  }
}

// ==================== POST ACTIONS ====================

/**
 * Create a new post
 */
export async function createPost(input: CreatePostInput) {
  if (!db) return { success: false, error: 'Database not available' };
  try {
    const session = await requireAuth();
    const validated = createPostSchema.parse(input);

    // Check board exists and user has permission
    const board = await db.query.boards.findFirst({
      where: eq(boards.id, validated.boardId),
    });

    if (!board || !board.isActive) {
      return { success: false, error: '게시판을 찾을 수 없습니다' };
    }

    // Check user level requirement
    const user = await db.query.users.findFirst({
      where: eq(users.id, session.userId),
      columns: { level: true },
    });

    if (!user || user.level < board.minLevelToPost) {
      return {
        success: false,
        error: `이 게시판에 글을 작성하려면 레벨 ${board.minLevelToPost} 이상이어야 합니다`,
      };
    }

    // Sanitize HTML content before storing
    const sanitizedHtml = validated.contentHtml
      ? DOMPurify.sanitize(validated.contentHtml, {
          ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 's', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'blockquote', 'code', 'pre', 'a', 'img'],
          ALLOWED_ATTR: ['href', 'src', 'alt', 'class', 'target', 'rel'],
        })
      : null;

    // Create post
    const [newPost] = await db
      .insert(posts)
      .values({
        boardId: validated.boardId,
        authorId: session.userId,
        title: validated.title,
        content: validated.content,
        contentHtml: sanitizedHtml,
        status: 'published',
        isPinned: validated.isPinned || false,
        isFeatured: validated.isFeatured || false,
      })
      .returning({ id: posts.id });

    // Update board post count
    await db
      .update(boards)
      .set({
        postCount: sql`${boards.postCount} + 1`,
      })
      .where(eq(boards.id, validated.boardId));

    // Award XP and points
    await Promise.all([
      awardXP(session.userId, 10, 'post', newPost.id),
      awardPoints(session.userId, 20, 'earn_post', newPost.id, '게시글 작성'),
    ]);

    revalidatePath(`/board/${board.slug}`);

    return { success: true, postId: newPost.id };
  } catch (error) {
    console.error('Create post error:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: '게시글 작성 중 오류가 발생했습니다' };
  }
}

/**
 * Update an existing post
 */
export async function updatePost(input: UpdatePostInput) {
  if (!db) return { success: false, error: 'Database not available' };
  try {
    const session = await requireAuth();
    const validated = updatePostSchema.parse(input);

    // Check ownership
    const owned = await isPostOwner(validated.postId, session.userId);
    if (!owned) {
      return { success: false, error: '게시글을 수정할 권한이 없습니다' };
    }

    // Sanitize HTML content before storing
    const sanitizedHtml = validated.contentHtml
      ? DOMPurify.sanitize(validated.contentHtml, {
          ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 's', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'blockquote', 'code', 'pre', 'a', 'img'],
          ALLOWED_ATTR: ['href', 'src', 'alt', 'class', 'target', 'rel'],
        })
      : undefined;

    // Update post
    await db
      .update(posts)
      .set({
        ...(validated.title && { title: validated.title }),
        ...(validated.content && { content: validated.content }),
        ...(sanitizedHtml && { contentHtml: sanitizedHtml }),
        ...(validated.status && { status: validated.status }),
        updatedAt: new Date(),
      })
      .where(eq(posts.id, validated.postId));

    // Get board slug for revalidation
    const post = await db.query.posts.findFirst({
      where: eq(posts.id, validated.postId),
      with: {
        board: {
          columns: { slug: true },
        },
      },
    });

    if (post?.board && !Array.isArray(post.board)) {
      revalidatePath(`/board/${post.board.slug}`);
      revalidatePath(`/board/${post.board.slug}/${validated.postId}`);
    }

    return { success: true };
  } catch (error) {
    console.error('Update post error:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: '게시글 수정 중 오류가 발생했습니다' };
  }
}

/**
 * Delete a post (soft delete)
 */
export async function deletePost(input: DeletePostInput) {
  if (!db) return { success: false, error: 'Database not available' };
  try {
    const session = await requireAuth();
    const validated = deletePostSchema.parse(input);

    // Check ownership
    const owned = await isPostOwner(validated.postId, session.userId);
    if (!owned) {
      return { success: false, error: '게시글을 삭제할 권한이 없습니다' };
    }

    // Get post info before deletion
    const post = await db.query.posts.findFirst({
      where: eq(posts.id, validated.postId),
      with: {
        board: {
          columns: { slug: true, id: true },
        },
      },
    });

    if (!post) {
      return { success: false, error: '게시글을 찾을 수 없습니다' };
    }

    // Soft delete
    await db
      .update(posts)
      .set({
        status: 'deleted',
        updatedAt: new Date(),
      })
      .where(eq(posts.id, validated.postId));

    // Update board post count
    if (post.board && !Array.isArray(post.board)) {
      await db
        .update(boards)
        .set({
          postCount: sql`${boards.postCount} - 1`,
        })
        .where(eq(boards.id, post.board.id));

      revalidatePath(`/board/${post.board.slug}`);
    }

    return { success: true };
  } catch (error) {
    console.error('Delete post error:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: '게시글 삭제 중 오류가 발생했습니다' };
  }
}

// ==================== LIKE & BOOKMARK ACTIONS ====================

/**
 * Toggle post like
 */
export async function togglePostLike(input: TogglePostLikeInput) {
  if (!db) return { success: false, error: 'Database not available' };
  try {
    const session = await requireAuth();
    const validated = togglePostLikeSchema.parse(input);

    // Check if already liked
    const existingLike = await db.query.postLikes.findFirst({
      where: and(
        eq(postLikes.postId, validated.postId),
        eq(postLikes.userId, session.userId)
      ),
    });

    if (existingLike) {
      // Unlike
      await db
        .delete(postLikes)
        .where(
          and(
            eq(postLikes.postId, validated.postId),
            eq(postLikes.userId, session.userId)
          )
        );

      // Decrement like count
      await db
        .update(posts)
        .set({
          likeCount: sql`${posts.likeCount} - 1`,
        })
        .where(eq(posts.id, validated.postId));

      return { success: true, liked: false };
    } else {
      // Like
      await db.insert(postLikes).values({
        postId: validated.postId,
        userId: session.userId,
      });

      // Increment like count
      await db
        .update(posts)
        .set({
          likeCount: sql`${posts.likeCount} + 1`,
        })
        .where(eq(posts.id, validated.postId));

      // Award points to post author
      const post = await db.query.posts.findFirst({
        where: eq(posts.id, validated.postId),
        columns: { authorId: true },
      });

      if (post && post.authorId !== session.userId) {
        await awardPoints(post.authorId, 5, 'earn_like', validated.postId, '게시글 좋아요 받음');
      }

      return { success: true, liked: true };
    }
  } catch (error) {
    console.error('Toggle post like error:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: '좋아요 처리 중 오류가 발생했습니다' };
  }
}

/**
 * Toggle bookmark
 */
export async function toggleBookmark(input: ToggleBookmarkInput) {
  if (!db) return { success: false, error: 'Database not available' };
  try {
    const session = await requireAuth();
    const validated = toggleBookmarkSchema.parse(input);

    // Check if already bookmarked
    const existingBookmark = await db.query.bookmarks.findFirst({
      where: and(
        eq(bookmarks.postId, validated.postId),
        eq(bookmarks.userId, session.userId)
      ),
    });

    if (existingBookmark) {
      // Remove bookmark
      await db
        .delete(bookmarks)
        .where(
          and(
            eq(bookmarks.postId, validated.postId),
            eq(bookmarks.userId, session.userId)
          )
        );

      // Decrement bookmark count
      await db
        .update(posts)
        .set({
          bookmarkCount: sql`${posts.bookmarkCount} - 1`,
        })
        .where(eq(posts.id, validated.postId));

      return { success: true, bookmarked: false };
    } else {
      // Add bookmark
      await db.insert(bookmarks).values({
        postId: validated.postId,
        userId: session.userId,
      });

      // Increment bookmark count
      await db
        .update(posts)
        .set({
          bookmarkCount: sql`${posts.bookmarkCount} + 1`,
        })
        .where(eq(posts.id, validated.postId));

      return { success: true, bookmarked: true };
    }
  } catch (error) {
    console.error('Toggle bookmark error:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: '북마크 처리 중 오류가 발생했습니다' };
  }
}

// ==================== COMMENT ACTIONS ====================

/**
 * Create a comment
 */
export async function createComment(input: CreateCommentInput) {
  if (!db) return { success: false, error: 'Database not available' };
  try {
    const session = await requireAuth();
    const validated = createCommentSchema.parse(input);

    // Verify post exists
    const post = await db.query.posts.findFirst({
      where: eq(posts.id, validated.postId),
      columns: { id: true, authorId: true },
    });

    if (!post) {
      return { success: false, error: '게시글을 찾을 수 없습니다' };
    }

    // Create comment
    const [newComment] = await db
      .insert(comments)
      .values({
        postId: validated.postId,
        authorId: session.userId,
        content: validated.content,
        parentId: validated.parentId || null,
        status: 'published',
      })
      .returning({ id: comments.id });

    // Update post comment count
    await db
      .update(posts)
      .set({
        commentCount: sql`${posts.commentCount} + 1`,
      })
      .where(eq(posts.id, validated.postId));

    // Award XP and points
    const commentId = String(newComment.id);
    await Promise.all([
      awardXP(session.userId, 2, 'comment', commentId),
      awardPoints(session.userId, 5, 'earn_comment', commentId, '댓글 작성'),
    ]);

    revalidatePath(`/board/[slug]/[postId]`, 'page');

    return { success: true, commentId: newComment.id };
  } catch (error) {
    console.error('Create comment error:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: '댓글 작성 중 오류가 발생했습니다' };
  }
}

/**
 * Toggle comment like
 */
export async function toggleCommentLike(input: ToggleCommentLikeInput) {
  if (!db) return { success: false, error: 'Database not available' };
  try {
    const session = await requireAuth();
    const validated = toggleCommentLikeSchema.parse(input);

    // Check if already liked
    const existingLike = await db.query.commentLikes.findFirst({
      where: and(
        eq(commentLikes.commentId, validated.commentId),
        eq(commentLikes.userId, session.userId)
      ),
    });

    if (existingLike) {
      // Unlike
      await db
        .delete(commentLikes)
        .where(
          and(
            eq(commentLikes.commentId, validated.commentId),
            eq(commentLikes.userId, session.userId)
          )
        );

      // Decrement like count
      await db
        .update(comments)
        .set({
          likeCount: sql`${comments.likeCount} - 1`,
        })
        .where(eq(comments.id, validated.commentId));

      return { success: true, liked: false };
    } else {
      // Like
      await db.insert(commentLikes).values({
        commentId: validated.commentId,
        userId: session.userId,
      });

      // Increment like count
      await db
        .update(comments)
        .set({
          likeCount: sql`${comments.likeCount} + 1`,
        })
        .where(eq(comments.id, validated.commentId));

      return { success: true, liked: true };
    }
  } catch (error) {
    console.error('Toggle comment like error:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: '좋아요 처리 중 오류가 발생했습니다' };
  }
}

// ==================== REPORT ACTIONS ====================

/**
 * Report a post
 */
export async function reportPost(input: ReportPostInput) {
  if (!db) return { success: false, error: 'Database not available' };
  try {
    const session = await requireAuth();
    const validated = reportPostSchema.parse(input);

    // Check if post exists
    const post = await db.query.posts.findFirst({
      where: eq(posts.id, validated.postId),
      columns: { id: true },
    });

    if (!post) {
      return { success: false, error: '게시글을 찾을 수 없습니다' };
    }

    // Create report
    await db.insert(reports).values({
      reporterId: session.userId,
      targetType: 'post',
      targetId: validated.postId,
      reason: validated.reason,
      status: 'pending',
    });

    return { success: true };
  } catch (error) {
    console.error('Report post error:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: '신고 처리 중 오류가 발생했습니다' };
  }
}

// ==================== VIEW COUNT ====================

/**
 * Increment post view count
 */
export async function incrementViewCount(postId: string) {
  if (!db) return { success: false };
  try {
    await db
      .update(posts)
      .set({
        viewCount: sql`${posts.viewCount} + 1`,
      })
      .where(eq(posts.id, postId));

    return { success: true };
  } catch (error) {
    console.error('Increment view count error:', error);
    return { success: false };
  }
}

/**
 * Update a comment
 */
export async function updateComment(input: { commentId: string; content: string }) {
  if (!db) return { success: false, error: 'Database not available' };
  try {
    const session = await requireAuth();

    if (!input.content || input.content.trim().length === 0) {
      return { success: false, error: '댓글 내용을 입력해주세요' };
    }

    const owned = await isCommentOwner(input.commentId, session.userId);
    if (!owned) {
      return { success: false, error: '댓글을 수정할 권한이 없습니다' };
    }

    await db
      .update(comments)
      .set({
        content: input.content.trim(),
        updatedAt: new Date(),
      })
      .where(eq(comments.id, input.commentId));

    revalidatePath(`/board/[slug]/[postId]`, 'page');
    return { success: true };
  } catch (error) {
    console.error('Update comment error:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: '댓글 수정 중 오류가 발생했습니다' };
  }
}

/**
 * Delete a comment (soft delete)
 */
export async function deleteComment(input: { commentId: string }) {
  if (!db) return { success: false, error: 'Database not available' };
  try {
    const session = await requireAuth();

    const owned = await isCommentOwner(input.commentId, session.userId);
    if (!owned) {
      return { success: false, error: '댓글을 삭제할 권한이 없습니다' };
    }

    // Get the comment's postId before deleting
    const comment = await db.query.comments.findFirst({
      where: eq(comments.id, input.commentId),
      columns: { postId: true },
    });

    if (!comment) {
      return { success: false, error: '댓글을 찾을 수 없습니다' };
    }

    // Soft delete
    await db
      .update(comments)
      .set({
        status: 'deleted',
        updatedAt: new Date(),
      })
      .where(eq(comments.id, input.commentId));

    // Decrement post comment count
    await db
      .update(posts)
      .set({
        commentCount: sql`${posts.commentCount} - 1`,
      })
      .where(eq(posts.id, comment.postId));

    revalidatePath(`/board/[slug]/[postId]`, 'page');
    return { success: true };
  } catch (error) {
    console.error('Delete comment error:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: '댓글 삭제 중 오류가 발생했습니다' };
  }
}

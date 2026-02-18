'use server';

import { db } from '@/lib/db';
import { posts, postLikes, comments, commentLikes, pokerHands, pokerHandLikes, threads, threadLikes } from '@/lib/db/schema';
import { getSession } from '@/lib/auth/session';
import { eq, and, sql } from 'drizzle-orm';

interface ToggleLikeResult {
  success: boolean;
  isLiked: boolean;
  likeCount: number;
  error?: string;
}

export async function toggleLike(
  targetId: string,
  targetType: 'post' | 'comment' | 'hand' | 'thread'
): Promise<ToggleLikeResult> {
  if (!db) return { success: false, isLiked: false, likeCount: 0, error: 'Database unavailable' };

  const session = await getSession();
  if (!session) {
    return { success: false, isLiked: false, likeCount: 0, error: 'Unauthorized' };
  }

  const userId = session.userId;

  try {
    return await db.transaction(async (tx: any) => {
      if (targetType === 'post') {
        const [existing] = await tx
          .select()
          .from(postLikes)
          .where(and(eq(postLikes.userId, userId), eq(postLikes.postId, targetId)));

        if (existing) {
          await tx.delete(postLikes).where(
            and(eq(postLikes.userId, userId), eq(postLikes.postId, targetId))
          );
          const [updated] = await tx
            .update(posts)
            .set({ likeCount: sql`${posts.likeCount} - 1` })
            .where(eq(posts.id, targetId))
            .returning({ likeCount: posts.likeCount });
          return { success: true, isLiked: false, likeCount: updated.likeCount };
        } else {
          await tx.insert(postLikes).values({ userId, postId: targetId });
          const [updated] = await tx
            .update(posts)
            .set({ likeCount: sql`${posts.likeCount} + 1` })
            .where(eq(posts.id, targetId))
            .returning({ likeCount: posts.likeCount });
          return { success: true, isLiked: true, likeCount: updated.likeCount };
        }
      }

      if (targetType === 'comment') {
        const [existing] = await tx
          .select()
          .from(commentLikes)
          .where(and(eq(commentLikes.userId, userId), eq(commentLikes.commentId, targetId)));

        if (existing) {
          await tx.delete(commentLikes).where(
            and(eq(commentLikes.userId, userId), eq(commentLikes.commentId, targetId))
          );
          const [updated] = await tx
            .update(comments)
            .set({ likeCount: sql`${comments.likeCount} - 1` })
            .where(eq(comments.id, targetId))
            .returning({ likeCount: comments.likeCount });
          return { success: true, isLiked: false, likeCount: updated.likeCount };
        } else {
          await tx.insert(commentLikes).values({ userId, commentId: targetId });
          const [updated] = await tx
            .update(comments)
            .set({ likeCount: sql`${comments.likeCount} + 1` })
            .where(eq(comments.id, targetId))
            .returning({ likeCount: comments.likeCount });
          return { success: true, isLiked: true, likeCount: updated.likeCount };
        }
      }

      if (targetType === 'hand') {
        const [existing] = await tx
          .select()
          .from(pokerHandLikes)
          .where(and(eq(pokerHandLikes.userId, userId), eq(pokerHandLikes.handId, targetId)));

        if (existing) {
          await tx.delete(pokerHandLikes).where(
            and(eq(pokerHandLikes.userId, userId), eq(pokerHandLikes.handId, targetId))
          );
          const [updated] = await tx
            .update(pokerHands)
            .set({ likeCount: sql`${pokerHands.likeCount} - 1` })
            .where(eq(pokerHands.id, targetId))
            .returning({ likeCount: pokerHands.likeCount });
          return { success: true, isLiked: false, likeCount: updated.likeCount };
        } else {
          await tx.insert(pokerHandLikes).values({ userId, handId: targetId });
          const [updated] = await tx
            .update(pokerHands)
            .set({ likeCount: sql`${pokerHands.likeCount} + 1` })
            .where(eq(pokerHands.id, targetId))
            .returning({ likeCount: pokerHands.likeCount });
          return { success: true, isLiked: true, likeCount: updated.likeCount };
        }
      }

      if (targetType === 'thread') {
        const [existing] = await tx
          .select()
          .from(threadLikes)
          .where(and(eq(threadLikes.userId, userId), eq(threadLikes.threadId, targetId)));

        if (existing) {
          await tx.delete(threadLikes).where(
            and(eq(threadLikes.userId, userId), eq(threadLikes.threadId, targetId))
          );
          const [updated] = await tx
            .update(threads)
            .set({ likesCount: sql`${threads.likesCount} - 1` })
            .where(eq(threads.id, targetId))
            .returning({ likesCount: threads.likesCount });
          return { success: true, isLiked: false, likeCount: updated.likesCount };
        } else {
          await tx.insert(threadLikes).values({ userId, threadId: targetId });
          const [updated] = await tx
            .update(threads)
            .set({ likesCount: sql`${threads.likesCount} + 1` })
            .where(eq(threads.id, targetId))
            .returning({ likesCount: threads.likesCount });
          return { success: true, isLiked: true, likeCount: updated.likesCount };
        }
      }

      return { success: false, isLiked: false, likeCount: 0, error: 'Invalid target type' };
    });
  } catch (error) {
    console.error('toggleLike error:', error);
    return { success: false, isLiked: false, likeCount: 0, error: 'Failed to toggle like' };
  }
}

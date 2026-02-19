'use server';

import { db } from '@/lib/db';
import { threads, threadLikes, threadReplies, users } from '@/lib/db/schema';
import { getSession } from '@/lib/auth/session';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

// ==================== TYPES ====================

interface ThreadAuthor {
  id: string;
  nickname: string;
  avatarUrl: string | null;
  level: number;
}

export interface ThreadData {
  id: string;
  author: ThreadAuthor;
  content: string;
  contentHtml: string | null;
  imageUrl: string | null;
  likesCount: number;
  repliesCount: number;
  isLiked: boolean;
  createdAt: string;
}

export interface ThreadReplyData {
  id: string;
  author: ThreadAuthor;
  content: string;
  createdAt: string;
}

// Internal shapes matching Drizzle select projections (db is typed as any due to nullable fallback)
interface ThreadRow {
  id: string;
  content: string;
  contentHtml: string | null;
  imageUrl: string | null;
  likesCount: number;
  repliesCount: number;
  createdAt: Date;
  authorId: string;
  authorNickname: string;
  authorAvatarUrl: string | null;
  authorLevel: number;
}

interface LikeRow {
  threadId: string;
}

interface ReplyRow {
  id: string;
  content: string;
  createdAt: Date;
  authorId: string;
  authorNickname: string;
  authorAvatarUrl: string | null;
  authorLevel: number;
}

// ==================== HELPER FUNCTIONS ====================

async function requireAuth() {
  const session = await getSession();
  if (!session) {
    throw new Error('로그인이 필요합니다');
  }
  return session;
}

// ==================== ACTIONS ====================

/**
 * Create a new thread
 */
export async function createThread(data: { content: string; imageUrl?: string }) {
  if (!db) return { success: false, error: 'Database not available' };
  try {
    const session = await requireAuth();

    if (!data.content || data.content.trim().length === 0) {
      return { success: false, error: '내용을 입력해주세요' };
    }

    if (data.content.length > 500) {
      return { success: false, error: '내용은 500자를 초과할 수 없습니다' };
    }

    const escapeHtml = (str: string) => str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    const contentHtml = `<p>${escapeHtml(data.content)}</p>`;

    const [newThread] = await db
      .insert(threads)
      .values({
        authorId: session.userId,
        content: data.content,
        contentHtml,
        imageUrl: data.imageUrl || null,
      })
      .returning({ id: threads.id });

    revalidatePath('/threads');

    return { success: true, threadId: newThread.id };
  } catch (error) {
    console.error('Create thread error:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: '쓰레드 작성 중 오류가 발생했습니다' };
  }
}

/**
 * Delete a thread
 */
export async function deleteThread(threadId: string) {
  if (!db) return { success: false, error: 'Database not available' };
  try {
    const session = await requireAuth();

    const [thread] = await db
      .select({ authorId: threads.authorId })
      .from(threads)
      .where(eq(threads.id, threadId))
      .limit(1);

    if (!thread) {
      return { success: false, error: '쓰레드를 찾을 수 없습니다' };
    }

    if (thread.authorId !== session.userId) {
      return { success: false, error: '쓰레드를 삭제할 권한이 없습니다' };
    }

    await db.delete(threads).where(eq(threads.id, threadId));

    revalidatePath('/threads');

    return { success: true };
  } catch (error) {
    console.error('Delete thread error:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: '쓰레드 삭제 중 오류가 발생했습니다' };
  }
}

/**
 * Toggle thread like
 */
export async function toggleThreadLike(threadId: string) {
  if (!db) return { success: false, error: 'Database not available' };
  try {
    const session = await requireAuth();

    // Atomic toggle inside a transaction: insert-or-delete, then update counter
    // tx is any because db is typed as any (nullable fallback in lib/db/index.ts)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { liked, likesCount } = await db.transaction(async (tx: any) => {
      // Attempt insert; composite PK suppresses duplicate inserts
      const inserted = await tx
        .insert(threadLikes)
        .values({ userId: session.userId, threadId })
        .onConflictDoNothing()
        .returning({ threadId: threadLikes.threadId });

      let liked: boolean;
      if (inserted.length > 0) {
        // Newly inserted → increment counter atomically
        liked = true;
        await tx
          .update(threads)
          .set({ likesCount: sql`${threads.likesCount} + 1` })
          .where(eq(threads.id, threadId));
      } else {
        // Row existed → delete it (unfollow), verify removal via RETURNING
        const deleted = await tx
          .delete(threadLikes)
          .where(
            and(
              eq(threadLikes.userId, session.userId),
              eq(threadLikes.threadId, threadId)
            )
          )
          .returning({ threadId: threadLikes.threadId });

        liked = deleted.length === 0;
        if (deleted.length > 0) {
          // Decrement counter atomically; clamp to 0 to avoid negatives
          await tx
            .update(threads)
            .set({ likesCount: sql`GREATEST(${threads.likesCount} - 1, 0)` })
            .where(eq(threads.id, threadId));
        }
      }

      const [updated] = await tx
        .select({ likesCount: threads.likesCount })
        .from(threads)
        .where(eq(threads.id, threadId))
        .limit(1);

      return { liked, likesCount: updated?.likesCount ?? 0 };
    });

    revalidatePath('/threads');
    return { success: true, liked, likesCount };
  } catch (error) {
    console.error('Toggle thread like error:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: '좋아요 처리 중 오류가 발생했습니다' };
  }
}

/**
 * Create a thread reply
 */
export async function createThreadReply(data: { threadId: string; content: string }) {
  if (!db) return { success: false, error: 'Database not available' };
  try {
    const session = await requireAuth();

    if (!data.content || data.content.trim().length === 0) {
      return { success: false, error: '댓글 내용을 입력해주세요' };
    }

    if (data.content.length > 300) {
      return { success: false, error: '댓글은 300자를 초과할 수 없습니다' };
    }

    const [thread] = await db
      .select({ id: threads.id })
      .from(threads)
      .where(eq(threads.id, data.threadId))
      .limit(1);

    if (!thread) {
      return { success: false, error: '쓰레드를 찾을 수 없습니다' };
    }

    const [newReply] = await db
      .insert(threadReplies)
      .values({
        threadId: data.threadId,
        authorId: session.userId,
        content: data.content,
      })
      .returning({ id: threadReplies.id });

    await db
      .update(threads)
      .set({ repliesCount: sql`${threads.repliesCount} + 1` })
      .where(eq(threads.id, data.threadId));

    revalidatePath('/threads');

    return { success: true, replyId: newReply.id };
  } catch (error) {
    console.error('Create thread reply error:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: '댓글 작성 중 오류가 발생했습니다' };
  }
}

/**
 * Get thread feed (paginated)
 */
export async function getThreadFeed(page: number = 1) {
  if (!db) return { threads: [], hasMore: false };
  try {
    const session = await getSession();
    const pageSize = 10;
    const offset = (page - 1) * pageSize;

    const result = (await db
      .select({
        id: threads.id,
        content: threads.content,
        contentHtml: threads.contentHtml,
        imageUrl: threads.imageUrl,
        likesCount: threads.likesCount,
        repliesCount: threads.repliesCount,
        createdAt: threads.createdAt,
        authorId: users.id,
        authorNickname: users.nickname,
        authorAvatarUrl: users.avatarUrl,
        authorLevel: users.level,
      })
      .from(threads)
      .innerJoin(users, eq(threads.authorId, users.id))
      .orderBy(desc(threads.createdAt))
      .limit(pageSize + 1)
      .offset(offset)) as ThreadRow[];

    const hasMore = result.length > pageSize;
    const threadsData = result.slice(0, pageSize);

    // Get liked status if user is logged in
    let likedThreadIds: Set<string> = new Set();
    if (session && threadsData.length > 0) {
      const threadIds = threadsData.map((t) => t.id);
      const likes = (await db
        .select({ threadId: threadLikes.threadId })
        .from(threadLikes)
        .where(
          and(
            eq(threadLikes.userId, session.userId),
            inArray(threadLikes.threadId, threadIds)
          )
        )) as LikeRow[];
      likedThreadIds = new Set(likes.map((l) => l.threadId));
    }

    const threadsResult: ThreadData[] = threadsData.map((t) => ({
      id: t.id,
      author: {
        id: t.authorId,
        nickname: t.authorNickname,
        avatarUrl: t.authorAvatarUrl,
        level: t.authorLevel,
      },
      content: t.content,
      contentHtml: t.contentHtml,
      imageUrl: t.imageUrl,
      likesCount: t.likesCount,
      repliesCount: t.repliesCount,
      isLiked: likedThreadIds.has(t.id),
      createdAt: t.createdAt.toISOString(),
    }));

    return { threads: threadsResult, hasMore };
  } catch (error) {
    console.error('Get thread feed error:', error);
    return { threads: [], hasMore: false };
  }
}

/**
 * Get threads by specific user (paginated)
 */
export async function getUserThreads(userId: string, page: number = 1) {
  if (!db) return { threads: [], hasMore: false };
  try {
    const session = await getSession();
    const pageSize = 10;
    const offset = (page - 1) * pageSize;

    const result = (await db
      .select({
        id: threads.id,
        content: threads.content,
        contentHtml: threads.contentHtml,
        imageUrl: threads.imageUrl,
        likesCount: threads.likesCount,
        repliesCount: threads.repliesCount,
        createdAt: threads.createdAt,
        authorId: users.id,
        authorNickname: users.nickname,
        authorAvatarUrl: users.avatarUrl,
        authorLevel: users.level,
      })
      .from(threads)
      .innerJoin(users, eq(threads.authorId, users.id))
      .where(eq(threads.authorId, userId))
      .orderBy(desc(threads.createdAt))
      .limit(pageSize + 1)
      .offset(offset)) as ThreadRow[];

    const hasMore = result.length > pageSize;
    const threadsData = result.slice(0, pageSize);

    // Get liked status if user is logged in
    let likedThreadIds: Set<string> = new Set();
    if (session && threadsData.length > 0) {
      const threadIds = threadsData.map((t) => t.id);
      const likes = (await db
        .select({ threadId: threadLikes.threadId })
        .from(threadLikes)
        .where(
          and(
            eq(threadLikes.userId, session.userId),
            inArray(threadLikes.threadId, threadIds)
          )
        )) as LikeRow[];
      likedThreadIds = new Set(likes.map((l) => l.threadId));
    }

    const threadsResult: ThreadData[] = threadsData.map((t) => ({
      id: t.id,
      author: {
        id: t.authorId,
        nickname: t.authorNickname,
        avatarUrl: t.authorAvatarUrl,
        level: t.authorLevel,
      },
      content: t.content,
      contentHtml: t.contentHtml,
      imageUrl: t.imageUrl,
      likesCount: t.likesCount,
      repliesCount: t.repliesCount,
      isLiked: likedThreadIds.has(t.id),
      createdAt: t.createdAt.toISOString(),
    }));

    return { threads: threadsResult, hasMore };
  } catch (error) {
    console.error('Get user threads error:', error);
    return { threads: [], hasMore: false };
  }
}

/**
 * Get thread detail with replies
 */
export async function getThreadDetail(threadId: string) {
  if (!db) return { thread: null, replies: [] };
  try {
    const session = await getSession();

    // Get thread with author info
    const [threadResult] = await db
      .select({
        id: threads.id,
        content: threads.content,
        contentHtml: threads.contentHtml,
        imageUrl: threads.imageUrl,
        likesCount: threads.likesCount,
        repliesCount: threads.repliesCount,
        createdAt: threads.createdAt,
        authorId: users.id,
        authorNickname: users.nickname,
        authorAvatarUrl: users.avatarUrl,
        authorLevel: users.level,
      })
      .from(threads)
      .innerJoin(users, eq(threads.authorId, users.id))
      .where(eq(threads.id, threadId))
      .limit(1);

    if (!threadResult) {
      return { thread: null, replies: [] };
    }

    // Check if thread is liked by current user
    let isLiked = false;
    if (session) {
      const [like] = await db
        .select()
        .from(threadLikes)
        .where(
          and(
            eq(threadLikes.userId, session.userId),
            eq(threadLikes.threadId, threadId)
          )
        )
        .limit(1);
      isLiked = !!like;
    }

    const thread: ThreadData = {
      id: threadResult.id,
      author: {
        id: threadResult.authorId,
        nickname: threadResult.authorNickname,
        avatarUrl: threadResult.authorAvatarUrl,
        level: threadResult.authorLevel,
      },
      content: threadResult.content,
      contentHtml: threadResult.contentHtml,
      imageUrl: threadResult.imageUrl,
      likesCount: threadResult.likesCount,
      repliesCount: threadResult.repliesCount,
      isLiked,
      createdAt: threadResult.createdAt.toISOString(),
    };

    // Get replies with author info (capped at 50 to prevent unbounded fetch)
    const repliesResult = (await db
      .select({
        id: threadReplies.id,
        content: threadReplies.content,
        createdAt: threadReplies.createdAt,
        authorId: users.id,
        authorNickname: users.nickname,
        authorAvatarUrl: users.avatarUrl,
        authorLevel: users.level,
      })
      .from(threadReplies)
      .innerJoin(users, eq(threadReplies.authorId, users.id))
      .where(eq(threadReplies.threadId, threadId))
      .orderBy(threadReplies.createdAt)
      .limit(50)) as ReplyRow[];

    const replies: ThreadReplyData[] = repliesResult.map((r) => ({
      id: r.id,
      author: {
        id: r.authorId,
        nickname: r.authorNickname,
        avatarUrl: r.authorAvatarUrl,
        level: r.authorLevel,
      },
      content: r.content,
      createdAt: r.createdAt.toISOString(),
    }));

    return { thread, replies };
  } catch (error) {
    console.error('Get thread detail error:', error);
    return { thread: null, replies: [] };
  }
}

export async function getThreadReplies(threadId: string): Promise<ThreadReplyData[]> {
  if (!db) return [];
  try {
    const repliesResult = (await db
      .select({
        id: threadReplies.id,
        content: threadReplies.content,
        createdAt: threadReplies.createdAt,
        authorId: users.id,
        authorNickname: users.nickname,
        authorAvatarUrl: users.avatarUrl,
        authorLevel: users.level,
      })
      .from(threadReplies)
      .innerJoin(users, eq(threadReplies.authorId, users.id))
      .where(eq(threadReplies.threadId, threadId))
      .orderBy(threadReplies.createdAt)
      .limit(50)) as ReplyRow[];

    return repliesResult.map((r) => ({
      id: r.id,
      author: {
        id: r.authorId,
        nickname: r.authorNickname,
        avatarUrl: r.authorAvatarUrl,
        level: r.authorLevel,
      },
      content: r.content,
      createdAt: r.createdAt.toISOString(),
    }));
  } catch (error) {
    console.error('Get thread replies error:', error);
    return [];
  }
}

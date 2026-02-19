'use server';

import { db } from '@/lib/db';
import { newsBookmarks } from '@/lib/db/schema';
import { getSession } from '@/lib/auth/session';
import { eq, and } from 'drizzle-orm';
import type { InferSelectModel } from 'drizzle-orm';

type NewsBookmarkRow = InferSelectModel<typeof newsBookmarks>;

export async function toggleNewsBookmark(
  newsId: string,
  title: string,
  link: string,
  source: string
): Promise<{ bookmarked: boolean } | { error: string }> {
  try {
    const session = await getSession();
    if (!session) return { error: '로그인이 필요합니다' };

    const [existing] = await db
      .select()
      .from(newsBookmarks)
      .where(
        and(
          eq(newsBookmarks.userId, session.userId),
          eq(newsBookmarks.newsId, newsId)
        )
      )
      .limit(1);

    if (existing) {
      await db
        .delete(newsBookmarks)
        .where(
          and(
            eq(newsBookmarks.userId, session.userId),
            eq(newsBookmarks.newsId, newsId)
          )
        );
      return { bookmarked: false };
    } else {
      await db.insert(newsBookmarks).values({
        userId: session.userId,
        newsId,
        title,
        link,
        source,
      });
      return { bookmarked: true };
    }
  } catch (error) {
    console.error('toggleNewsBookmark error:', error);
    return { error: '북마크 처리 중 오류가 발생했습니다' };
  }
}

export interface BookmarkedNewsItem {
  newsId: string;
  title: string;
  link: string;
  source: string;
  createdAt: Date;
}

export async function getBookmarkedNews(): Promise<
  BookmarkedNewsItem[] | { error: string }
> {
  try {
    const session = await getSession();
    if (!session) return { error: '로그인이 필요합니다' };

    const rows = await db
      .select()
      .from(newsBookmarks)
      .where(eq(newsBookmarks.userId, session.userId))
      .orderBy(newsBookmarks.createdAt);

    return rows.map((r: NewsBookmarkRow) => ({
      newsId: r.newsId,
      title: r.title,
      link: r.link,
      source: r.source,
      createdAt: r.createdAt,
    }));
  } catch (error) {
    console.error('getBookmarkedNews error:', error);
    return { error: '북마크 목록을 불러오는 중 오류가 발생했습니다' };
  }
}

export async function getUserNewsBookmarkIds(): Promise<string[] | { error: string }> {
  try {
    const session = await getSession();
    if (!session) return [];

    const rows = await db
      .select({ newsId: newsBookmarks.newsId })
      .from(newsBookmarks)
      .where(eq(newsBookmarks.userId, session.userId));

    return (rows as { newsId: string }[]).map((r) => r.newsId);
  } catch (error) {
    console.error('getUserNewsBookmarkIds error:', error);
    return [];
  }
}

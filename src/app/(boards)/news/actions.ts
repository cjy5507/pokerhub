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
  const session = await getSession();
  if (!session) return { error: 'Login required' };

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
  const session = await getSession();
  if (!session) return { error: 'Login required' };

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
}

export async function getUserNewsBookmarkIds(): Promise<string[] | { error: string }> {
  const session = await getSession();
  if (!session) return [];

  const rows = await db
    .select({ newsId: newsBookmarks.newsId })
    .from(newsBookmarks)
    .where(eq(newsBookmarks.userId, session.userId));

  return (rows as { newsId: string }[]).map((r) => r.newsId);
}

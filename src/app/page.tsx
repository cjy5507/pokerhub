import type { Metadata } from 'next';

export const revalidate = 300; // ISR: regenerate every 5 minutes

export const metadata: Metadata = {
  title: 'Open Poker - 포커 커뮤니티',
  description: '포커 전략, 핸드 분석, 실시간 게임을 즐기는 포커 커뮤니티',
};

import { db } from '@/lib/db';
import { posts, boards, users } from '@/lib/db/schema';
import { eq, desc, and, gte, sql } from 'drizzle-orm';
import { getNewsItems, type NewsItem } from '@/lib/rss';
import { HomeClient } from './HomeClient';

export interface PostData {
  id: string;
  title: string;
  boardSlug: string;
  author: string;
  authorId: string;
  level: number;
  views: number;
  likes: number;
  commentCount: number;
  createdAt: string;
}

async function getBoardPosts(boardSlug: string, limit = 8): Promise<PostData[]> {
  if (!db) return [];

  try {
    const result = await db
      .select({
        id: posts.id,
        title: posts.title,
        boardSlug: boards.slug,
        author: users.nickname,
        authorId: users.id,
        level: users.level,
        views: posts.viewCount,
        likes: posts.likeCount,
        commentCount: posts.commentCount,
        createdAt: posts.createdAt,
      })
      .from(posts)
      .innerJoin(users, eq(posts.authorId, users.id))
      .innerJoin(boards, eq(posts.boardId, boards.id))
      .where(
        and(
          eq(posts.status, 'published'),
          eq(boards.slug, boardSlug)
        )
      )
      .orderBy(desc(posts.createdAt))
      .limit(limit);

    return result.map((row: any) => ({
      ...row,
      createdAt: row.createdAt.toISOString(),
    }));
  } catch (error) {
    console.error(`Failed to fetch ${boardSlug} posts:`, error);
    return [];
  }
}

async function getHotPosts(): Promise<PostData[]> {
  if (!db) return [];

  try {
    const twentyFourHoursAgo = sql`now() - interval '24 hours'`;

    const result = await db
      .select({
        id: posts.id,
        title: posts.title,
        boardSlug: boards.slug,
        author: users.nickname,
        authorId: users.id,
        level: users.level,
        views: posts.viewCount,
        likes: posts.likeCount,
        commentCount: posts.commentCount,
        createdAt: posts.createdAt,
      })
      .from(posts)
      .innerJoin(users, eq(posts.authorId, users.id))
      .innerJoin(boards, eq(posts.boardId, boards.id))
      .where(
        and(
          eq(posts.status, 'published'),
          gte(posts.createdAt, twentyFourHoursAgo)
        )
      )
      .orderBy(desc(posts.likeCount))
      .limit(8);

    return result.map((row: any) => ({
      ...row,
      createdAt: row.createdAt.toISOString(),
    }));
  } catch (error) {
    console.error('Failed to fetch hot posts:', error);
    return [];
  }
}

async function fetchNews(): Promise<NewsItem[]> {
  try {
    const { items } = await getNewsItems({ limit: 4 });
    return items;
  } catch (error) {
    console.error('Failed to fetch news:', error);
    return [];
  }
}

export default async function Home() {
  const [
    newsItems,
    noticePosts,
    freePosts,
    strategyPosts,
    handPosts,
    hotPosts,
  ] = await Promise.all([
    fetchNews(),
    getBoardPosts('notice', 3),
    getBoardPosts('free', 8),
    getBoardPosts('strategy', 8),
    getBoardPosts('hands', 8),
    getHotPosts(),
  ]);

  return (
    <HomeClient
      newsItems={newsItems}
      noticePosts={noticePosts}
      freePosts={freePosts}
      strategyPosts={strategyPosts}
      handPosts={handPosts}
      hotPosts={hotPosts}
    />
  );
}

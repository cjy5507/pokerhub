import { db } from '@/lib/db';
import { posts, boards, users } from '@/lib/db/schema';
import { eq, desc, and, gte, sql } from 'drizzle-orm';
import { HomeClient } from './HomeClient';

interface PostData {
  id: string;
  title: string;
  boardSlug: string;
  author: string;
  authorId: string;
  level: number;
  views: number;
  likes: number;
  createdAt: string;
}

async function getRecentPosts(): Promise<PostData[]> {
  if (!db) return [];

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
      createdAt: posts.createdAt,
    })
    .from(posts)
    .innerJoin(users, eq(posts.authorId, users.id))
    .innerJoin(boards, eq(posts.boardId, boards.id))
    .where(
      and(
        eq(posts.status, 'published'),
        eq(boards.slug, 'free')
      )
    )
    .orderBy(desc(posts.createdAt))
    .limit(10);

  return result.map((row: any) => ({
    ...row,
    createdAt: row.createdAt.toISOString(),
  }));
}

async function getStrategyPosts(): Promise<PostData[]> {
  if (!db) return [];

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
      createdAt: posts.createdAt,
    })
    .from(posts)
    .innerJoin(users, eq(posts.authorId, users.id))
    .innerJoin(boards, eq(posts.boardId, boards.id))
    .where(
      and(
        eq(posts.status, 'published'),
        eq(boards.slug, 'strategy')
      )
    )
    .orderBy(desc(posts.createdAt))
    .limit(10);

  return result.map((row: any) => ({
    ...row,
    createdAt: row.createdAt.toISOString(),
  }));
}

async function getHandPosts(): Promise<PostData[]> {
  if (!db) return [];

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
      createdAt: posts.createdAt,
    })
    .from(posts)
    .innerJoin(users, eq(posts.authorId, users.id))
    .innerJoin(boards, eq(posts.boardId, boards.id))
    .where(
      and(
        eq(posts.status, 'published'),
        eq(boards.slug, 'hands')
      )
    )
    .orderBy(desc(posts.createdAt))
    .limit(10);

  return result.map((row: any) => ({
    ...row,
    createdAt: row.createdAt.toISOString(),
  }));
}

async function getHotPosts(): Promise<PostData[]> {
  if (!db) return [];

  const sevenDaysAgo = sql`now() - interval '7 days'`;

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
      createdAt: posts.createdAt,
    })
    .from(posts)
    .innerJoin(users, eq(posts.authorId, users.id))
    .innerJoin(boards, eq(posts.boardId, boards.id))
    .where(
      and(
        eq(posts.status, 'published'),
        gte(posts.createdAt, sevenDaysAgo)
      )
    )
    .orderBy(desc(posts.likeCount))
    .limit(10);

  return result.map((row: any) => ({
    ...row,
    createdAt: row.createdAt.toISOString(),
  }));
}

export default async function Home() {
  const [recentPosts, strategyPosts, handPosts, hotPosts] = await Promise.all([
    getRecentPosts(),
    getStrategyPosts(),
    getHandPosts(),
    getHotPosts(),
  ]);

  return (
    <HomeClient
      recentPosts={recentPosts}
      strategyPosts={strategyPosts}
      handPosts={handPosts}
      hotPosts={hotPosts}
    />
  );
}

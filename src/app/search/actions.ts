'use server';

import { db } from '@/lib/db';
import { posts, boards, users } from '@/lib/db/schema';
import { eq, and, ilike, or, desc } from 'drizzle-orm';

export interface SearchResult {
  id: string;
  title: string;
  author: string;
  board: string;
  boardSlug: string;
  date: string;
  content?: string;
}

export async function searchPosts(query: string): Promise<SearchResult[]> {
  if (!db) return [];
  if (!query.trim()) return [];

  const searchPattern = `%${query.trim()}%`;

  const results = await db
    .select({
      id: posts.id,
      title: posts.title,
      content: posts.content,
      createdAt: posts.createdAt,
      authorNickname: users.nickname,
      boardName: boards.nameKo,
      boardSlug: boards.slug,
    })
    .from(posts)
    .innerJoin(users, eq(posts.authorId, users.id))
    .innerJoin(boards, eq(posts.boardId, boards.id))
    .where(
      and(
        eq(posts.status, 'published'),
        or(
          ilike(posts.title, searchPattern),
          ilike(posts.content, searchPattern)
        )
      )
    )
    .orderBy(desc(posts.createdAt))
    .limit(20);

  return results.map((r: any) => ({
    id: r.id,
    title: r.title,
    author: r.authorNickname,
    board: r.boardName,
    boardSlug: r.boardSlug,
    date: r.createdAt.toISOString().split('T')[0],
    content: r.content?.substring(0, 200),
  }));
}

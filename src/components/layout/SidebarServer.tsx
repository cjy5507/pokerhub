import { db } from '@/lib/db';
import { posts, users, boards } from '@/lib/db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import Sidebar from './Sidebar';

async function getSidebarData() {
  if (!db) {
    return {
      popularPosts: [],
      onlineCount: 0,
    };
  }

  try {
    const popularPosts = await db
      .select({
        id: posts.id,
        title: posts.title,
        likes: posts.likeCount,
        boardSlug: boards.slug,
      })
      .from(posts)
      .innerJoin(boards, eq(posts.boardId, boards.id))
      .where(eq(posts.status, 'published'))
      .orderBy(desc(posts.likeCount))
      .limit(5);

    const totalUsers = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(eq(users.status, 'active'));

    const onlineCount = Math.max(1, Math.floor((totalUsers[0]?.count || 0) * 0.07));

    return {
      popularPosts,
      onlineCount,
    };
  } catch {
    return {
      popularPosts: [],
      onlineCount: 0,
    };
  }
}

export default async function SidebarServer() {
  const data = await getSidebarData();
  return <Sidebar {...data} />;
}

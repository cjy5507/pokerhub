'use server';

import { db } from '@/lib/db';
import { users, posts, boards, pointTransactions } from '@/lib/db/schema';
import { eq, desc, sql, like, or, and, gte } from 'drizzle-orm';
import { getSession } from '@/lib/auth/session';
import { awardPoints, spendPoints } from '@/lib/gamification/points';

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    throw new Error('관리자 권한이 필요합니다');
  }
  return session;
}

// ==================== DASHBOARD ====================

export async function getAdminDashboard() {
  await requireAdmin();
  if (!db) return { totalUsers: 0, todaySignups: 0, totalPosts: 0, activeUsers: 0, recentUsers: [] };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [
    [totalUsersResult],
    [todaySignupsResult],
    [totalPostsResult],
    [activeUsersResult],
    recentUsers,
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(users),
    db.select({ count: sql<number>`count(*)::int` }).from(users).where(gte(users.createdAt, today)),
    db.select({ count: sql<number>`count(*)::int` }).from(posts),
    db.select({ count: sql<number>`count(*)::int` }).from(users).where(gte(users.updatedAt, sevenDaysAgo)),
    db
      .select({
        id: users.id,
        nickname: users.nickname,
        email: users.email,
        role: users.role,
        status: users.status,
        level: users.level,
        points: users.points,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(5),
  ]);

  return {
    totalUsers: totalUsersResult?.count || 0,
    todaySignups: todaySignupsResult?.count || 0,
    totalPosts: totalPostsResult?.count || 0,
    activeUsers: activeUsersResult?.count || 0,
    recentUsers,
  };
}

// ==================== USERS ====================

export async function getAdminUsers(page: number = 1, limit: number = 20, search?: string) {
  await requireAdmin();
  if (!db) return { users: [], pagination: { page, limit, total: 0, totalPages: 0 } };

  const offset = (page - 1) * limit;

  const conditions = search
    ? or(
        like(users.nickname, `%${search}%`),
        like(users.email, `%${search}%`)
      )
    : undefined;

  const userList = await db
    .select({
      id: users.id,
      nickname: users.nickname,
      email: users.email,
      role: users.role,
      status: users.status,
      level: users.level,
      points: users.points,
      xp: users.xp,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(conditions)
    .orderBy(desc(users.createdAt))
    .limit(limit)
    .offset(offset);

  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users)
    .where(conditions);

  return {
    users: userList,
    pagination: {
      page,
      limit,
      total: countResult?.count || 0,
      totalPages: Math.ceil((countResult?.count || 0) / limit),
    },
  };
}

export async function updateUserRole(userId: string, role: 'user' | 'admin' | 'moderator') {
  const session = await requireAdmin();
  if (!db) return { success: false };

  if (userId === session.userId) {
    throw new Error('자신의 역할은 변경할 수 없습니다');
  }

  await db
    .update(users)
    .set({ role, updatedAt: new Date() })
    .where(eq(users.id, userId));

  return { success: true };
}

export async function adjustUserPoints(userId: string, amount: number, reason: string) {
  await requireAdmin();

  if (amount === 0) throw new Error('금액은 0이 될 수 없습니다');

  if (amount > 0) {
    return await awardPoints(userId, amount, 'admin_adjust', undefined, reason);
  } else {
    return await spendPoints(userId, Math.abs(amount), 'admin_adjust', undefined, reason);
  }
}

export async function toggleUserBan(userId: string) {
  const session = await requireAdmin();
  if (!db) return { success: false, newStatus: 'active' as const };

  if (userId === session.userId) {
    throw new Error('자신을 정지할 수 없습니다');
  }

  const [user] = await db
    .select({ status: users.status })
    .from(users)
    .where(eq(users.id, userId));

  if (!user) throw new Error('유저를 찾을 수 없습니다');

  const newStatus = user.status === 'suspended' ? 'active' : 'suspended';

  await db
    .update(users)
    .set({ status: newStatus, updatedAt: new Date() })
    .where(eq(users.id, userId));

  return { success: true, newStatus };
}

// ==================== POSTS ====================

export async function getAdminPosts(page: number = 1, limit: number = 20, search?: string) {
  await requireAdmin();
  if (!db) return { posts: [], pagination: { page, limit, total: 0, totalPages: 0 } };

  const offset = (page - 1) * limit;

  const conditions = search
    ? like(posts.title, `%${search}%`)
    : undefined;

  const postList = await db
    .select({
      id: posts.id,
      title: posts.title,
      status: posts.status,
      viewCount: posts.viewCount,
      likeCount: posts.likeCount,
      commentCount: posts.commentCount,
      createdAt: posts.createdAt,
      authorNickname: users.nickname,
      boardName: boards.nameKo,
    })
    .from(posts)
    .leftJoin(users, eq(posts.authorId, users.id))
    .leftJoin(boards, eq(posts.boardId, boards.id))
    .where(conditions)
    .orderBy(desc(posts.createdAt))
    .limit(limit)
    .offset(offset);

  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(posts)
    .where(conditions);

  return {
    posts: postList,
    pagination: {
      page,
      limit,
      total: countResult?.count || 0,
      totalPages: Math.ceil((countResult?.count || 0) / limit),
    },
  };
}

export async function deleteAdminPost(postId: string) {
  await requireAdmin();
  if (!db) return { success: false };

  await db
    .update(posts)
    .set({ status: 'deleted', updatedAt: new Date() })
    .where(eq(posts.id, postId));

  return { success: true };
}

// ==================== STATS ====================

export async function getAdminStats() {
  await requireAdmin();
  if (!db) return { dailySignups: [], dailyPosts: [], pointEconomy: { totalCirculation: 0, totalEarned: 0, totalSpent: 0 } };

  // Daily signups (last 30 days)
  const dailySignups = await db.execute(sql`
    SELECT DATE(created_at AT TIME ZONE 'Asia/Seoul') as date, COUNT(*)::int as count
    FROM users
    WHERE created_at >= NOW() - INTERVAL '30 days'
    GROUP BY DATE(created_at AT TIME ZONE 'Asia/Seoul')
    ORDER BY date DESC
  `);

  // Daily posts (last 30 days)
  const dailyPosts = await db.execute(sql`
    SELECT DATE(created_at AT TIME ZONE 'Asia/Seoul') as date, COUNT(*)::int as count
    FROM posts
    WHERE created_at >= NOW() - INTERVAL '30 days'
    GROUP BY DATE(created_at AT TIME ZONE 'Asia/Seoul')
    ORDER BY date DESC
  `);

  // Point economy
  const [totalCirculation] = await db
    .select({ total: sql<number>`COALESCE(SUM(points), 0)::int` })
    .from(users);

  const [totalEarned] = await db
    .select({ total: sql<number>`COALESCE(SUM(amount), 0)::int` })
    .from(pointTransactions)
    .where(sql`amount > 0`);

  const [totalSpent] = await db
    .select({ total: sql<number>`COALESCE(ABS(SUM(amount)), 0)::int` })
    .from(pointTransactions)
    .where(sql`amount < 0`);

  return {
    dailySignups: (dailySignups as any).rows || [],
    dailyPosts: (dailyPosts as any).rows || [],
    pointEconomy: {
      totalCirculation: totalCirculation?.total || 0,
      totalEarned: totalEarned?.total || 0,
      totalSpent: totalSpent?.total || 0,
    },
  };
}

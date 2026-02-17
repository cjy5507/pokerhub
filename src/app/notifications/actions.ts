'use server';

import { db } from '@/lib/db';
import { notifications, users } from '@/lib/db/schema';
import { getSession } from '@/lib/auth/session';
import { eq, and, desc, sql, count } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

interface NotificationData {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  isRead: boolean;
  actor: {
    id: string;
    nickname: string;
    avatarUrl: string | null;
  } | null;
  createdAt: string;
}

interface CreateNotificationData {
  userId: string;
  type: 'comment' | 'like' | 'follow' | 'mention' | 'badge' | 'level_up' | 'system';
  title: string;
  body?: string;
  link?: string;
  actorId?: string;
}

/**
 * Get paginated notifications for current user with actor details
 */
export async function getNotifications(page = 1, limit = 20) {
  if (!db) return { notifications: [], hasMore: false, unreadCount: 0 };
  const session = await getSession();
  if (!session) {
    throw new Error('Unauthorized');
  }

  const offset = (page - 1) * limit;

  // Get notifications with actor information
  const notificationsList = await db
    .select({
      id: notifications.id,
      type: notifications.type,
      title: notifications.title,
      body: notifications.body,
      link: notifications.link,
      isRead: notifications.isRead,
      createdAt: notifications.createdAt,
      actorId: notifications.actorId,
      actorNickname: users.nickname,
      actorAvatarUrl: users.avatarUrl,
    })
    .from(notifications)
    .leftJoin(users, eq(notifications.actorId, users.id))
    .where(eq(notifications.userId, session.userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit + 1)
    .offset(offset);

  const hasMore = notificationsList.length > limit;
  const notificationsData = notificationsList.slice(0, limit);

  // Get unread count
  const unreadResult = await db
    .select({ count: count() })
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, session.userId),
        eq(notifications.isRead, false)
      )
    );

  const unreadCount = unreadResult[0]?.count ?? 0;

  // Format notifications
  const formattedNotifications: NotificationData[] = notificationsData.map((n: any) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    link: n.link,
    isRead: n.isRead,
    actor: n.actorId
      ? {
          id: n.actorId,
          nickname: n.actorNickname!,
          avatarUrl: n.actorAvatarUrl,
        }
      : null,
    createdAt: n.createdAt.toISOString(),
  }));

  return {
    notifications: formattedNotifications,
    hasMore,
    unreadCount,
  };
}

/**
 * Get count of unread notifications for current user
 */
export async function getUnreadCount() {
  if (!db) return { count: 0 };
  const session = await getSession();
  if (!session) {
    return { count: 0 };
  }

  const result = await db
    .select({ count: count() })
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, session.userId),
        eq(notifications.isRead, false)
      )
    );

  return { count: result[0]?.count ?? 0 };
}

/**
 * Mark a single notification as read
 */
export async function markAsRead(notificationId: string) {
  if (!db) return;
  const session = await getSession();
  if (!session) {
    throw new Error('Unauthorized');
  }

  await db
    .update(notifications)
    .set({ isRead: true })
    .where(
      and(
        eq(notifications.id, notificationId),
        eq(notifications.userId, session.userId)
      )
    );

  revalidatePath('/notifications');
}

/**
 * Mark all notifications as read for current user
 */
export async function markAllAsRead() {
  if (!db) return;
  const session = await getSession();
  if (!session) {
    throw new Error('Unauthorized');
  }

  await db
    .update(notifications)
    .set({ isRead: true })
    .where(
      and(
        eq(notifications.userId, session.userId),
        eq(notifications.isRead, false)
      )
    );

  revalidatePath('/notifications');
}

/**
 * Delete a notification (verify ownership)
 */
export async function deleteNotification(notificationId: string) {
  if (!db) return;
  const session = await getSession();
  if (!session) {
    throw new Error('Unauthorized');
  }

  await db
    .delete(notifications)
    .where(
      and(
        eq(notifications.id, notificationId),
        eq(notifications.userId, session.userId)
      )
    );

  revalidatePath('/notifications');
}

/**
 * Create a new notification (for internal use by other server actions)
 */
export async function createNotification(data: CreateNotificationData) {
  if (!db) return;
  await db.insert(notifications).values({
    userId: data.userId,
    type: data.type,
    title: data.title,
    body: data.body,
    link: data.link,
    actorId: data.actorId,
  });

  revalidatePath('/notifications');
}

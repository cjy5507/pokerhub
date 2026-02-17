'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { users, userFollows, userBlocks, userSettings } from '@/lib/db/schema';
import { getSession } from '@/lib/auth/session';
import { eq, and, sql, count } from 'drizzle-orm';
import { z } from 'zod';
import { hashPassword, verifyPassword } from '@/lib/auth/password';

/**
 * Toggle follow/unfollow a user
 */
export async function toggleFollow(targetUserId: string): Promise<{
  success: boolean;
  isFollowing: boolean;
  error?: string;
}> {
  if (!db) return { success: false, isFollowing: false, error: 'Database not available' };
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, isFollowing: false, error: '로그인이 필요합니다' };
    }

    if (session.userId === targetUserId) {
      return { success: false, isFollowing: false, error: '자기 자신을 팔로우할 수 없습니다' };
    }

    // Check if already following
    const [existing] = await db
      .select()
      .from(userFollows)
      .where(
        and(
          eq(userFollows.followerId, session.userId),
          eq(userFollows.followingId, targetUserId)
        )
      )
      .limit(1);

    if (existing) {
      // Unfollow
      await db
        .delete(userFollows)
        .where(
          and(
            eq(userFollows.followerId, session.userId),
            eq(userFollows.followingId, targetUserId)
          )
        );

      revalidatePath(`/profile/${targetUserId}`);
      return { success: true, isFollowing: false };
    } else {
      // Follow
      await db.insert(userFollows).values({
        followerId: session.userId,
        followingId: targetUserId,
      });

      revalidatePath(`/profile/${targetUserId}`);
      return { success: true, isFollowing: true };
    }
  } catch (error) {
    console.error('Error toggling follow:', error);
    return { success: false, isFollowing: false, error: '오류가 발생했습니다' };
  }
}

/**
 * Toggle block/unblock a user
 */
export async function toggleBlock(targetUserId: string): Promise<{
  success: boolean;
  isBlocked: boolean;
  error?: string;
}> {
  if (!db) return { success: false, isBlocked: false, error: 'Database not available' };
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, isBlocked: false, error: '로그인이 필요합니다' };
    }

    if (session.userId === targetUserId) {
      return { success: false, isBlocked: false, error: '자기 자신을 차단할 수 없습니다' };
    }

    // Check if already blocked
    const [existing] = await db
      .select()
      .from(userBlocks)
      .where(
        and(
          eq(userBlocks.blockerId, session.userId),
          eq(userBlocks.blockedId, targetUserId)
        )
      )
      .limit(1);

    if (existing) {
      // Unblock
      await db
        .delete(userBlocks)
        .where(
          and(
            eq(userBlocks.blockerId, session.userId),
            eq(userBlocks.blockedId, targetUserId)
          )
        );

      revalidatePath(`/profile/${targetUserId}`);
      return { success: true, isBlocked: false };
    } else {
      // Block
      await db.insert(userBlocks).values({
        blockerId: session.userId,
        blockedId: targetUserId,
      });

      // Also unfollow if following
      await db
        .delete(userFollows)
        .where(
          and(
            eq(userFollows.followerId, session.userId),
            eq(userFollows.followingId, targetUserId)
          )
        );

      revalidatePath(`/profile/${targetUserId}`);
      return { success: true, isBlocked: true };
    }
  } catch (error) {
    console.error('Error toggling block:', error);
    return { success: false, isBlocked: false, error: '오류가 발생했습니다' };
  }
}

const updateProfileSchema = z.object({
  bio: z.string().max(500, '자기소개는 500자 이하여야 합니다').optional(),
  avatarUrl: z.string().url('유효한 URL을 입력해주세요').optional().or(z.literal('')),
  bannerUrl: z.string().url('유효한 URL을 입력해주세요').optional().or(z.literal('')),
});

/**
 * Update user profile
 */
export async function updateProfile(data: {
  bio?: string;
  avatarUrl?: string;
  bannerUrl?: string;
}): Promise<{
  success: boolean;
  error?: string;
}> {
  if (!db) return { success: false, error: 'Database not available' };
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: '로그인이 필요합니다' };
    }

    // Validate input
    const result = updateProfileSchema.safeParse(data);
    if (!result.success) {
      return { success: false, error: result.error.issues[0].message };
    }

    // Update profile
    const updateData: any = { updatedAt: new Date() };

    if (data.bio !== undefined) updateData.bio = data.bio || null;
    if (data.avatarUrl !== undefined) updateData.avatarUrl = data.avatarUrl || null;
    if (data.bannerUrl !== undefined) updateData.bannerUrl = data.bannerUrl || null;

    await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, session.userId));

    revalidatePath(`/profile/${session.userId}`);
    return { success: true };
  } catch (error) {
    console.error('Error updating profile:', error);
    return { success: false, error: '프로필 업데이트 중 오류가 발생했습니다' };
  }
}

/**
 * Update user settings
 */
export async function updateUserSettings(settings: {
  notifyComments?: boolean;
  notifyLikes?: boolean;
  notifyFollows?: boolean;
  notifyMentions?: boolean;
  emailNotifications?: boolean;
  showOnlineStatus?: boolean;
}): Promise<{
  success: boolean;
  error?: string;
}> {
  if (!db) return { success: false, error: 'Database not available' };
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: '로그인이 필요합니다' };
    }

    // Upsert settings
    const updateData: any = { updatedAt: new Date() };

    if (settings.notifyComments !== undefined) updateData.notifyComments = settings.notifyComments;
    if (settings.notifyLikes !== undefined) updateData.notifyLikes = settings.notifyLikes;
    if (settings.notifyFollows !== undefined) updateData.notifyFollows = settings.notifyFollows;
    if (settings.notifyMentions !== undefined) updateData.notifyMentions = settings.notifyMentions;
    if (settings.emailNotifications !== undefined) updateData.emailNotifications = settings.emailNotifications;
    if (settings.showOnlineStatus !== undefined) updateData.showOnlineStatus = settings.showOnlineStatus;

    await db
      .insert(userSettings)
      .values({
        userId: session.userId,
        ...updateData,
      })
      .onConflictDoUpdate({
        target: userSettings.userId,
        set: updateData,
      });

    revalidatePath('/settings');
    return { success: true };
  } catch (error) {
    console.error('Error updating settings:', error);
    return { success: false, error: '설정 업데이트 중 오류가 발생했습니다' };
  }
}

/**
 * Get user settings
 */
export async function getUserSettings(): Promise<{
  success: boolean;
  settings?: {
    notifyComments: boolean;
    notifyLikes: boolean;
    notifyFollows: boolean;
    notifyMentions: boolean;
    emailNotifications: boolean;
    showOnlineStatus: boolean;
  };
  error?: string;
}> {
  if (!db) return { success: false, error: 'Database not available' };
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: '로그인이 필요합니다' };
    }

    // Get settings or create with defaults if not exists
    const [existingSettings] = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, session.userId))
      .limit(1);

    if (existingSettings) {
      return {
        success: true,
        settings: {
          notifyComments: existingSettings.notifyComments,
          notifyLikes: existingSettings.notifyLikes,
          notifyFollows: existingSettings.notifyFollows,
          notifyMentions: existingSettings.notifyMentions,
          emailNotifications: existingSettings.emailNotifications,
          showOnlineStatus: existingSettings.showOnlineStatus,
        },
      };
    }

    // Create default settings if not exists
    const [newSettings] = await db
      .insert(userSettings)
      .values({
        userId: session.userId,
      })
      .returning();

    return {
      success: true,
      settings: {
        notifyComments: newSettings.notifyComments,
        notifyLikes: newSettings.notifyLikes,
        notifyFollows: newSettings.notifyFollows,
        notifyMentions: newSettings.notifyMentions,
        emailNotifications: newSettings.emailNotifications,
        showOnlineStatus: newSettings.showOnlineStatus,
      },
    };
  } catch (error) {
    console.error('Error getting settings:', error);
    return { success: false, error: '설정을 불러오는 중 오류가 발생했습니다' };
  }
}

/**
 * Get followers for a user (paginated)
 */
export async function getFollowers(userId: string, page = 1): Promise<{
  success: boolean;
  followers?: Array<{
    id: string;
    nickname: string;
    level: number;
    avatarUrl: string | null;
    isFollowingBack: boolean;
  }>;
  totalCount?: number;
  error?: string;
}> {
  if (!db) return { success: false, error: 'Database not available' };
  try {
    const session = await getSession();
    const pageSize = 20;
    const offset = (page - 1) * pageSize;

    // Get total count
    const [{ value: totalCount }] = await db
      .select({ value: count() })
      .from(userFollows)
      .where(eq(userFollows.followingId, userId));

    // Get followers with user info
    const followersData = await db
      .select({
        id: users.id,
        nickname: users.nickname,
        level: users.level,
        avatarUrl: users.avatarUrl,
      })
      .from(userFollows)
      .innerJoin(users, eq(userFollows.followerId, users.id))
      .where(eq(userFollows.followingId, userId))
      .limit(pageSize)
      .offset(offset);

    // Check if session user follows each follower back
    const followersWithStatus = await Promise.all(
      followersData.map(async (follower: any) => {
        let isFollowingBack = false;

        if (session) {
          const [followBack] = await db
            .select()
            .from(userFollows)
            .where(
              and(
                eq(userFollows.followerId, session.userId),
                eq(userFollows.followingId, follower.id)
              )
            )
            .limit(1);

          isFollowingBack = !!followBack;
        }

        return {
          id: follower.id,
          nickname: follower.nickname,
          level: follower.level,
          avatarUrl: follower.avatarUrl,
          isFollowingBack,
        };
      })
    );

    return {
      success: true,
      followers: followersWithStatus,
      totalCount,
    };
  } catch (error) {
    console.error('Error getting followers:', error);
    return { success: false, error: '팔로워 목록을 불러오는 중 오류가 발생했습니다' };
  }
}

/**
 * Get following for a user (paginated)
 */
export async function getFollowing(userId: string, page = 1): Promise<{
  success: boolean;
  following?: Array<{
    id: string;
    nickname: string;
    level: number;
    avatarUrl: string | null;
  }>;
  totalCount?: number;
  error?: string;
}> {
  if (!db) return { success: false, error: 'Database not available' };
  try {
    const pageSize = 20;
    const offset = (page - 1) * pageSize;

    // Get total count
    const [{ value: totalCount }] = await db
      .select({ value: count() })
      .from(userFollows)
      .where(eq(userFollows.followerId, userId));

    // Get following with user info
    const followingData = await db
      .select({
        id: users.id,
        nickname: users.nickname,
        level: users.level,
        avatarUrl: users.avatarUrl,
      })
      .from(userFollows)
      .innerJoin(users, eq(userFollows.followingId, users.id))
      .where(eq(userFollows.followerId, userId))
      .limit(pageSize)
      .offset(offset);

    return {
      success: true,
      following: followingData,
      totalCount,
    };
  } catch (error) {
    console.error('Error getting following:', error);
    return { success: false, error: '팔로잉 목록을 불러오는 중 오류가 발생했습니다' };
  }
}

/**
 * Change password
 */
export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  if (!db) return { success: false, error: 'Database not available' };
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: '로그인이 필요합니다' };
    }

    if (currentPassword === newPassword) {
      return { success: false, error: '새 비밀번호는 현재 비밀번호와 달라야 합니다' };
    }

    // Get current user with password hash
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);

    if (!user) {
      return { success: false, error: '사용자를 찾을 수 없습니다' };
    }

    // Verify current password
    const isValid = await verifyPassword(currentPassword, user.passwordHash);
    if (!isValid) {
      return { success: false, error: '현재 비밀번호가 올바르지 않습니다' };
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update password
    await db
      .update(users)
      .set({
        passwordHash: newPasswordHash,
        updatedAt: new Date(),
      })
      .where(eq(users.id, session.userId));

    return { success: true };
  } catch (error) {
    console.error('Error changing password:', error);
    return { success: false, error: '비밀번호 변경 중 오류가 발생했습니다' };
  }
}

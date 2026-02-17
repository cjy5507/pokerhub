'use server';

import { db } from '@/lib/db';
import { badges, userBadges, posts, comments, userFollows, userStreaks, users } from '@/lib/db/schema';
import { eq, and, sql, count } from 'drizzle-orm';

export type Badge = {
  id: string;
  slug: string;
  nameKo: string;
  nameEn: string;
  descriptionKo: string | null;
  descriptionEn: string | null;
  iconUrl: string;
  category: 'achievement' | 'participation' | 'skill' | 'social' | 'special';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
};

export type UserBadge = Badge & {
  earnedAt: Date;
  isPinned: boolean;
  pinOrder: number | null;
};

/**
 * Get all active badges
 */
export async function getAllBadges(): Promise<Badge[]> {
  if (!db) return [];
  const allBadges = await db
    .select()
    .from(badges)
    .where(eq(badges.isActive, true))
    .orderBy(badges.sortOrder);

  return allBadges;
}

/**
 * Get badges for a specific user (JOIN badges + userBadges)
 */
export async function getUserBadges(userId: string): Promise<UserBadge[]> {
  if (!db) return [];
  const userBadgesList = await db
    .select({
      id: badges.id,
      slug: badges.slug,
      nameKo: badges.nameKo,
      nameEn: badges.nameEn,
      descriptionKo: badges.descriptionKo,
      descriptionEn: badges.descriptionEn,
      iconUrl: badges.iconUrl,
      category: badges.category,
      rarity: badges.rarity,
      sortOrder: badges.sortOrder,
      isActive: badges.isActive,
      createdAt: badges.createdAt,
      earnedAt: userBadges.earnedAt,
      isPinned: userBadges.isPinned,
      pinOrder: userBadges.pinOrder,
    })
    .from(userBadges)
    .innerJoin(badges, eq(userBadges.badgeId, badges.id))
    .where(eq(userBadges.userId, userId))
    .orderBy(userBadges.earnedAt);

  return userBadgesList;
}

/**
 * Award a badge to a user (idempotent - skips if already awarded)
 */
export async function awardBadge(userId: string, badgeId: string): Promise<boolean> {
  if (!db) return false;
  try {
    // Check if user already has this badge
    const [existing] = await db
      .select()
      .from(userBadges)
      .where(
        and(
          eq(userBadges.userId, userId),
          eq(userBadges.badgeId, badgeId)
        )
      )
      .limit(1);

    if (existing) {
      return false; // Already has badge
    }

    // Award the badge
    await db.insert(userBadges).values({
      userId,
      badgeId,
      earnedAt: new Date(),
      isPinned: false,
      pinOrder: null,
    });

    return true; // Successfully awarded
  } catch (error) {
    console.error('Error awarding badge:', error);
    return false;
  }
}

/**
 * Check all badge conditions and award any earned badges
 */
export async function checkAndAwardBadges(userId: string): Promise<string[]> {
  if (!db) return [];
  const awardedBadges: string[] = [];

  // Get all active badges
  const allBadges = await getAllBadges();

  for (const badge of allBadges) {
    let earned = false;

    switch (badge.slug) {
      case 'first_post': {
        // User has >= 1 published post
        const [result] = await db
          .select({ count: sql<number>`count(*)` })
          .from(posts)
          .where(
            and(
              eq(posts.authorId, userId),
              eq(posts.status, 'published')
            )
          );
        earned = Number(result.count) >= 1;
        break;
      }

      case 'commenter_10': {
        // User has >= 10 published comments
        const [result] = await db
          .select({ count: sql<number>`count(*)` })
          .from(comments)
          .where(
            and(
              eq(comments.authorId, userId),
              eq(comments.status, 'published')
            )
          );
        earned = Number(result.count) >= 10;
        break;
      }

      case 'popular_writer': {
        // User has any post with likeCount >= 50
        const [result] = await db
          .select({ count: sql<number>`count(*)` })
          .from(posts)
          .where(
            and(
              eq(posts.authorId, userId),
              eq(posts.status, 'published'),
              sql`${posts.likeCount} >= 50`
            )
          );
        earned = Number(result.count) >= 1;
        break;
      }

      case 'streak_master': {
        // User attendance streak >= 7 days
        const [userStreak] = await db
          .select()
          .from(userStreaks)
          .where(eq(userStreaks.userId, userId))
          .limit(1);

        earned = userStreak ? userStreak.attendanceStreak >= 7 : false;
        break;
      }

      case 'veteran': {
        // User level >= 20
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.id, userId))
          .limit(1);

        earned = user ? user.level >= 20 : false;
        break;
      }

      case 'social_butterfly': {
        // User has >= 10 followers
        const [result] = await db
          .select({ count: sql<number>`count(*)` })
          .from(userFollows)
          .where(eq(userFollows.followingId, userId));

        earned = Number(result.count) >= 10;
        break;
      }
    }

    if (earned) {
      const awarded = await awardBadge(userId, badge.id);
      if (awarded) {
        awardedBadges.push(badge.slug);
      }
    }
  }

  return awardedBadges;
}

/**
 * Get default badge definitions for seeding
 */
export async function getDefaultBadges() {
  return [
    {
      slug: 'first_post',
      nameKo: '첫 글 작성',
      nameEn: 'First Post',
      descriptionKo: '첫 번째 게시글을 작성했습니다',
      descriptionEn: 'Published your first post',
      iconUrl: '/icons/badges/first-post.svg',
      category: 'achievement' as const,
      rarity: 'common' as const,
      sortOrder: 1,
      isActive: true,
    },
    {
      slug: 'commenter_10',
      nameKo: '활발한 댓글러',
      nameEn: 'Active Commenter',
      descriptionKo: '댓글 10개를 달성했습니다',
      descriptionEn: 'Reached 10 comments',
      iconUrl: '/icons/badges/commenter-10.svg',
      category: 'participation' as const,
      rarity: 'common' as const,
      sortOrder: 2,
      isActive: true,
    },
    {
      slug: 'popular_writer',
      nameKo: '인기 작가',
      nameEn: 'Popular Writer',
      descriptionKo: '좋아요 50개를 받은 글이 있습니다',
      descriptionEn: 'Post received 50 likes',
      iconUrl: '/icons/badges/popular-writer.svg',
      category: 'skill' as const,
      rarity: 'rare' as const,
      sortOrder: 3,
      isActive: true,
    },
    {
      slug: 'streak_master',
      nameKo: '출석왕',
      nameEn: 'Streak Master',
      descriptionKo: '7일 연속 출석을 달성했습니다',
      descriptionEn: 'Achieved 7-day attendance streak',
      iconUrl: '/icons/badges/streak-master.svg',
      category: 'participation' as const,
      rarity: 'rare' as const,
      sortOrder: 4,
      isActive: true,
    },
    {
      slug: 'veteran',
      nameKo: '베테랑',
      nameEn: 'Veteran',
      descriptionKo: '레벨 20을 달성했습니다',
      descriptionEn: 'Reached level 20',
      iconUrl: '/icons/badges/veteran.svg',
      category: 'achievement' as const,
      rarity: 'epic' as const,
      sortOrder: 5,
      isActive: true,
    },
    {
      slug: 'social_butterfly',
      nameKo: '소셜 나비',
      nameEn: 'Social Butterfly',
      descriptionKo: '팔로워 10명을 달성했습니다',
      descriptionEn: 'Reached 10 followers',
      iconUrl: '/icons/badges/social-butterfly.svg',
      category: 'social' as const,
      rarity: 'rare' as const,
      sortOrder: 6,
      isActive: true,
    },
  ];
}

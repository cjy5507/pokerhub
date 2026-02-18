'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { badges, userBadges, users } from '@/lib/db/schema';
import { getSession } from '@/lib/auth/session';
import { eq, and } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { spendPoints } from '@/lib/gamification/points';

const BADGE_PRICES: Record<string, number> = {
  common: 100,
  rare: 300,
  epic: 500,
  legendary: 1000,
};

const CUSTOM_TITLE_PRICE = 500;

export async function purchaseBadge(badgeId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  if (!db) return { success: false, error: 'Database not available' };
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: '로그인이 필요합니다' };
    }

    // Get badge info outside transaction (read-only, no race risk)
    const [badge] = await db
      .select()
      .from(badges)
      .where(eq(badges.id, badgeId))
      .limit(1);

    if (!badge) {
      return { success: false, error: '뱃지를 찾을 수 없습니다' };
    }

    if (!badge.isActive) {
      return { success: false, error: '현재 구매할 수 없는 뱃지입니다' };
    }

    const price = BADGE_PRICES[badge.rarity] ?? 100;

    // Single transaction: check ownership + deduct points + insert badge atomically
    await db.transaction(async (tx: any) => {
      // Check if already owned inside transaction to prevent duplicate purchase
      const [existing] = await tx
        .select({ id: userBadges.userId })
        .from(userBadges)
        .where(
          and(
            eq(userBadges.userId, session.userId),
            eq(userBadges.badgeId, badgeId)
          )
        )
        .limit(1);

      if (existing) {
        throw new Error('이미 보유한 뱃지입니다');
      }

      // Atomically deduct points only if balance is sufficient
      const result = await tx
        .update(users)
        .set({
          points: sql`points - ${price}`,
          updatedAt: new Date(),
        })
        .where(and(eq(users.id, session.userId), sql`points >= ${price}`))
        .returning({ points: users.points });

      if (result.length === 0) {
        throw new Error('포인트가 부족합니다');
      }

      // Grant badge
      await tx.insert(userBadges).values({
        userId: session.userId,
        badgeId,
      });
    });

    revalidatePath('/settings');
    return { success: true };
  } catch (error: any) {
    if (error.message === '이미 보유한 뱃지입니다') {
      return { success: false, error: '이미 보유한 뱃지입니다' };
    }
    if (error.message === '포인트가 부족합니다') {
      return { success: false, error: '포인트가 부족합니다' };
    }
    console.error('Error purchasing badge:', error);
    return { success: false, error: '뱃지 구매 중 오류가 발생했습니다' };
  }
}

export async function purchaseCustomTitle(title: string): Promise<{
  success: boolean;
  error?: string;
}> {
  if (!db) return { success: false, error: 'Database not available' };
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: '로그인이 필요합니다' };
    }

    const trimmed = title.trim();
    if (trimmed.length < 2 || trimmed.length > 20) {
      return { success: false, error: '타이틀은 2~20자여야 합니다' };
    }

    // Spend points atomically
    try {
      await spendPoints(
        session.userId,
        CUSTOM_TITLE_PRICE,
        'spend_custom_title',
        undefined,
        `커스텀 타이틀 변경: ${trimmed}`
      );
    } catch (err: any) {
      if (err.message === 'Insufficient points') {
        return { success: false, error: '포인트가 부족합니다' };
      }
      throw err;
    }

    // Update custom title
    await db
      .update(users)
      .set({ customTitle: trimmed, updatedAt: new Date() })
      .where(eq(users.id, session.userId));

    revalidatePath('/settings');
    revalidatePath(`/profile/${session.userId}`);
    return { success: true };
  } catch (error) {
    console.error('Error purchasing custom title:', error);
    return { success: false, error: '타이틀 변경 중 오류가 발생했습니다' };
  }
}

export type BadgeShopItem = {
  id: string;
  slug: string;
  nameKo: string;
  nameEn: string;
  descriptionKo: string | null;
  iconUrl: string;
  category: string;
  rarity: string;
  price: number;
  owned: boolean;
};

export async function getBadgeShop(): Promise<{
  success: boolean;
  badges?: BadgeShopItem[];
  points?: number;
  customTitle?: string | null;
  error?: string;
}> {
  if (!db) return { success: false, error: 'Database not available' };
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: '로그인이 필요합니다' };
    }

    // Get all active badges
    const allBadges = await db
      .select()
      .from(badges)
      .where(eq(badges.isActive, true));

    // Get user's owned badges
    const ownedBadges = await db
      .select({ badgeId: userBadges.badgeId })
      .from(userBadges)
      .where(eq(userBadges.userId, session.userId));

    const ownedSet = new Set(ownedBadges.map((b: any) => b.badgeId));

    // Get user points and custom title
    const [user] = await db
      .select({ points: users.points, customTitle: users.customTitle })
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);

    const shopBadges: BadgeShopItem[] = (allBadges as any[]).map((b) => ({
      id: b.id,
      slug: b.slug,
      nameKo: b.nameKo,
      nameEn: b.nameEn,
      descriptionKo: b.descriptionKo,
      iconUrl: b.iconUrl,
      category: b.category,
      rarity: b.rarity,
      price: BADGE_PRICES[b.rarity] ?? 100,
      owned: ownedSet.has(b.id),
    }));

    return {
      success: true,
      badges: shopBadges,
      points: user?.points ?? 0,
      customTitle: user?.customTitle ?? null,
    };
  } catch (error) {
    console.error('Error loading badge shop:', error);
    return { success: false, error: '상점을 불러오는 중 오류가 발생했습니다' };
  }
}

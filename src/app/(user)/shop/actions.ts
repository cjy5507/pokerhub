'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { badges, userBadges, users, pointTransactions } from '@/lib/db/schema';
import { getSession } from '@/lib/auth/session';
import { eq, and, sql } from 'drizzle-orm';
import {
  BADGE_PRICES,
  TITLE_PRICES,
  CHIP_PACKAGES,
  AVATAR_FRAMES,
  EMOJI_PACKS,
} from './constants';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

export type ShopData = {
  badges: BadgeShopItem[];
  points: number;
  customTitle: string | null;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function deductPointsAtomic(
  tx: any,
  userId: string,
  amount: number,
  type: string,
  description: string
): Promise<number> {
  const result = await tx
    .update(users)
    .set({ points: sql`points - ${amount}`, updatedAt: new Date() })
    .where(and(eq(users.id, userId), sql`points >= ${amount}`))
    .returning({ points: users.points });

  if (result.length === 0) {
    throw new Error('포인트가 부족합니다');
  }

  const newBalance = result[0].points;

  await tx.insert(pointTransactions).values({
    userId,
    amount: -amount,
    balanceAfter: newBalance,
    type,
    description,
  });

  return newBalance;
}

// ---------------------------------------------------------------------------
// getShopData
// ---------------------------------------------------------------------------

export async function getShopData(): Promise<{
  success: boolean;
  data?: ShopData;
  error?: string;
}> {
  if (!db) return { success: false, error: 'Database not available' };
  try {
    const session = await getSession();
    if (!session) return { success: false, error: '로그인이 필요합니다' };

    const allBadges = await db
      .select()
      .from(badges)
      .where(eq(badges.isActive, true));

    const ownedBadges = await db
      .select({ badgeId: userBadges.badgeId })
      .from(userBadges)
      .where(eq(userBadges.userId, session.userId));

    const ownedSet = new Set(ownedBadges.map((b: any) => b.badgeId));

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
      data: {
        badges: shopBadges,
        points: user?.points ?? 0,
        customTitle: user?.customTitle ?? null,
      },
    };
  } catch (error) {
    console.error('Error loading shop data:', error);
    return { success: false, error: '상점 정보를 불러오는 중 오류가 발생했습니다' };
  }
}

// ---------------------------------------------------------------------------
// purchaseBadge
// ---------------------------------------------------------------------------

export async function purchaseBadge(badgeId: string): Promise<{
  success: boolean;
  newBalance?: number;
  error?: string;
}> {
  if (!db) return { success: false, error: 'Database not available' };
  try {
    const session = await getSession();
    if (!session) return { success: false, error: '로그인이 필요합니다' };

    const [badge] = await db
      .select()
      .from(badges)
      .where(eq(badges.id, badgeId))
      .limit(1);

    if (!badge) return { success: false, error: '뱃지를 찾을 수 없습니다' };
    if (!badge.isActive) return { success: false, error: '현재 구매할 수 없는 뱃지입니다' };

    const price = BADGE_PRICES[(badge as any).rarity] ?? 100;

    const newBalance = await db.transaction(async (tx: any) => {
      const [existing] = await tx
        .select({ id: userBadges.userId })
        .from(userBadges)
        .where(and(eq(userBadges.userId, session.userId), eq(userBadges.badgeId, badgeId)))
        .limit(1);

      if (existing) throw new Error('이미 보유한 뱃지입니다');

      const bal = await deductPointsAtomic(
        tx, session.userId, price, 'spend_badge',
        `뱃지 구매: ${(badge as any).nameKo}`
      );

      await tx.insert(userBadges).values({ userId: session.userId, badgeId });

      return bal;
    });

    revalidatePath('/shop');
    return { success: true, newBalance };
  } catch (error: any) {
    if (error.message === '이미 보유한 뱃지입니다') return { success: false, error: '이미 보유한 뱃지입니다' };
    if (error.message === '포인트가 부족합니다') return { success: false, error: '포인트가 부족합니다' };
    console.error('Error purchasing badge:', error);
    return { success: false, error: '뱃지 구매 중 오류가 발생했습니다' };
  }
}

// ---------------------------------------------------------------------------
// purchaseTitle
// ---------------------------------------------------------------------------

export async function purchaseTitle(titleLabel: string, isCustom: boolean): Promise<{
  success: boolean;
  newBalance?: number;
  error?: string;
}> {
  if (!db) return { success: false, error: 'Database not available' };
  try {
    const session = await getSession();
    if (!session) return { success: false, error: '로그인이 필요합니다' };

    const trimmed = titleLabel.trim();
    if (trimmed.length < 2 || trimmed.length > 20) {
      return { success: false, error: '타이틀은 2~20자여야 합니다' };
    }

    const price = isCustom ? TITLE_PRICES.custom : (TITLE_PRICES[trimmed] ?? 500);

    const newBalance = await db.transaction(async (tx: any) => {
      const bal = await deductPointsAtomic(
        tx, session.userId, price, 'spend_custom_title',
        `칭호 변경: ${trimmed}`
      );

      await tx
        .update(users)
        .set({ customTitle: trimmed, updatedAt: new Date() })
        .where(eq(users.id, session.userId));

      return bal;
    });

    revalidatePath('/shop');
    revalidatePath(`/profile/${session.userId}`);
    return { success: true, newBalance };
  } catch (error: any) {
    if (error.message === '포인트가 부족합니다') return { success: false, error: '포인트가 부족합니다' };
    console.error('Error purchasing title:', error);
    return { success: false, error: '칭호 변경 중 오류가 발생했습니다' };
  }
}

// ---------------------------------------------------------------------------
// purchaseChips
// ---------------------------------------------------------------------------

export async function purchaseChips(packageId: string): Promise<{
  success: boolean;
  newBalance?: number;
  chipsAdded?: number;
  error?: string;
}> {
  if (!db) return { success: false, error: 'Database not available' };
  try {
    const session = await getSession();
    if (!session) return { success: false, error: '로그인이 필요합니다' };

    const pkg = CHIP_PACKAGES.find((p) => p.id === packageId);
    if (!pkg) return { success: false, error: '잘못된 칩 패키지입니다' };

    const newBalance = await db.transaction(async (tx: any) => {
      return await deductPointsAtomic(
        tx, session.userId, pkg.price, 'spend_game',
        `게임칩 구매: ${pkg.label}`
      );
    });

    revalidatePath('/shop');
    return { success: true, newBalance, chipsAdded: pkg.chips };
  } catch (error: any) {
    if (error.message === '포인트가 부족합니다') return { success: false, error: '포인트가 부족합니다' };
    console.error('Error purchasing chips:', error);
    return { success: false, error: '게임칩 구매 중 오류가 발생했습니다' };
  }
}

// ---------------------------------------------------------------------------
// purchaseAvatarFrame
// ---------------------------------------------------------------------------

export async function purchaseAvatarFrame(frameId: string): Promise<{
  success: boolean;
  newBalance?: number;
  error?: string;
}> {
  if (!db) return { success: false, error: 'Database not available' };
  try {
    const session = await getSession();
    if (!session) return { success: false, error: '로그인이 필요합니다' };

    const frame = AVATAR_FRAMES.find((f) => f.id === frameId);
    if (!frame) return { success: false, error: '잘못된 아바타 프레임입니다' };

    const newBalance = await db.transaction(async (tx: any) => {
      return await deductPointsAtomic(
        tx, session.userId, frame.price, 'spend_badge',
        `아바타 프레임 구매: ${frame.label}`
      );
    });

    revalidatePath('/shop');
    return { success: true, newBalance };
  } catch (error: any) {
    if (error.message === '포인트가 부족합니다') return { success: false, error: '포인트가 부족합니다' };
    console.error('Error purchasing avatar frame:', error);
    return { success: false, error: '아바타 프레임 구매 중 오류가 발생했습니다' };
  }
}

// ---------------------------------------------------------------------------
// purchaseEmojiPack
// ---------------------------------------------------------------------------

export async function purchaseEmojiPack(packId: string): Promise<{
  success: boolean;
  newBalance?: number;
  error?: string;
}> {
  if (!db) return { success: false, error: 'Database not available' };
  try {
    const session = await getSession();
    if (!session) return { success: false, error: '로그인이 필요합니다' };

    const pack = EMOJI_PACKS.find((p) => p.id === packId);
    if (!pack) return { success: false, error: '잘못된 이모지 팩입니다' };

    const newBalance = await db.transaction(async (tx: any) => {
      return await deductPointsAtomic(
        tx, session.userId, pack.price, 'spend_badge',
        `이모지 팩 구매: ${pack.label}`
      );
    });

    revalidatePath('/shop');
    return { success: true, newBalance };
  } catch (error: any) {
    if (error.message === '포인트가 부족합니다') return { success: false, error: '포인트가 부족합니다' };
    console.error('Error purchasing emoji pack:', error);
    return { success: false, error: '이모지 팩 구매 중 오류가 발생했습니다' };
  }
}

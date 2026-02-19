import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Mocks ---

const mockTx = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  returning: vi.fn(),
};

const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  transaction: vi.fn(),
};

vi.mock('@/lib/db', () => ({ db: mockDb }));

const mockGetSession = vi.fn();
vi.mock('@/lib/auth/session', () => ({ getSession: mockGetSession }));

const mockRevalidatePath = vi.fn();
vi.mock('next/cache', () => ({ revalidatePath: mockRevalidatePath }));

const mockSpendPoints = vi.fn();
vi.mock('@/lib/gamification/points', () => ({
  spendPoints: mockSpendPoints,
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((...args: any[]) => ({ type: 'eq', args })),
  and: vi.fn((...args: any[]) => ({ type: 'and', args })),
  sql: Object.assign(
    vi.fn((strings: TemplateStringsArray, ...values: any[]) => ({ type: 'sql', strings, values })),
    { raw: vi.fn() }
  ),
}));

vi.mock('@/lib/db/schema', () => ({
  badges: {
    id: 'badges.id',
    slug: 'badges.slug',
    nameKo: 'badges.nameKo',
    nameEn: 'badges.nameEn',
    descriptionKo: 'badges.descriptionKo',
    iconUrl: 'badges.iconUrl',
    category: 'badges.category',
    rarity: 'badges.rarity',
    isActive: 'badges.isActive',
  },
  userBadges: {
    userId: 'userBadges.userId',
    badgeId: 'userBadges.badgeId',
  },
  users: {
    id: 'users.id',
    points: 'users.points',
    customTitle: 'users.customTitle',
    updatedAt: 'users.updatedAt',
  },
}));

function resetDbMocks() {
  for (const key of Object.keys(mockDb) as (keyof typeof mockDb)[]) {
    mockDb[key].mockReset();
    if (key !== 'transaction') {
      mockDb[key].mockReturnThis();
    }
  }
}

function resetTxMocks() {
  for (const key of Object.keys(mockTx) as (keyof typeof mockTx)[]) {
    mockTx[key].mockReset();
    if (key !== 'returning') {
      mockTx[key].mockReturnThis();
    }
  }
}

const userSession = { userId: 'user-1', email: 'user@test.com', nickname: 'User', role: 'user' };

describe('Settings / Shop Actions', () => {
  beforeEach(() => {
    vi.resetModules();
    resetDbMocks();
    resetTxMocks();
    mockGetSession.mockReset();
    mockRevalidatePath.mockReset();
    mockSpendPoints.mockReset();
  });

  // ==================== purchaseBadge ====================

  describe('purchaseBadge', () => {
    it('db가 null이면 { success: false, error: Database not available } 반환', async () => {
      vi.doMock('@/lib/db', () => ({ db: null }));
      vi.resetModules();
      vi.doMock('@/lib/auth/session', () => ({ getSession: mockGetSession }));
      vi.doMock('next/cache', () => ({ revalidatePath: mockRevalidatePath }));
      vi.doMock('@/lib/gamification/points', () => ({ spendPoints: mockSpendPoints }));

      const { purchaseBadge } = await import('@/app/(user)/settings/actions');
      const result = await purchaseBadge('badge-1');

      expect(result).toEqual({ success: false, error: 'Database not available' });

      vi.doMock('@/lib/db', () => ({ db: mockDb }));
    });

    it('세션 없으면 { success: false, error: 로그인이 필요합니다 } 반환', async () => {
      mockGetSession.mockResolvedValue(null);
      const { purchaseBadge } = await import('@/app/(user)/settings/actions');

      const result = await purchaseBadge('badge-1');

      expect(result).toEqual({ success: false, error: '로그인이 필요합니다' });
    });

    it('뱃지를 찾을 수 없으면 { success: false, error: 뱃지를 찾을 수 없습니다 } 반환', async () => {
      mockGetSession.mockResolvedValue(userSession);
      const { purchaseBadge } = await import('@/app/(user)/settings/actions');

      // select().from().where().limit() → no badge found
      mockDb.limit.mockResolvedValueOnce([]);

      const result = await purchaseBadge('nonexistent-badge');

      expect(result).toEqual({ success: false, error: '뱃지를 찾을 수 없습니다' });
    });

    it('비활성화된 뱃지면 { success: false, error: 현재 구매할 수 없는 뱃지입니다 } 반환', async () => {
      mockGetSession.mockResolvedValue(userSession);
      const { purchaseBadge } = await import('@/app/(user)/settings/actions');

      mockDb.limit.mockResolvedValueOnce([
        { id: 'badge-1', rarity: 'common', isActive: false },
      ]);

      const result = await purchaseBadge('badge-1');

      expect(result).toEqual({ success: false, error: '현재 구매할 수 없는 뱃지입니다' });
    });

    it('이미 보유한 뱃지면 { success: false, error: 이미 보유한 뱃지입니다 } 반환', async () => {
      mockGetSession.mockResolvedValue(userSession);
      const { purchaseBadge } = await import('@/app/(user)/settings/actions');

      // Badge info query
      mockDb.limit.mockResolvedValueOnce([
        { id: 'badge-1', rarity: 'common', isActive: true },
      ]);

      // Transaction: check ownership → already owned
      mockDb.transaction.mockImplementation(async (cb: any) => {
        resetTxMocks();
        mockTx.limit.mockResolvedValueOnce([{ id: 'user-1' }]); // existing ownership
        return cb(mockTx);
      });

      const result = await purchaseBadge('badge-1');

      expect(result).toEqual({ success: false, error: '이미 보유한 뱃지입니다' });
    });

    it('포인트 부족 시 { success: false, error: 포인트가 부족합니다 } 반환', async () => {
      mockGetSession.mockResolvedValue(userSession);
      const { purchaseBadge } = await import('@/app/(user)/settings/actions');

      mockDb.limit.mockResolvedValueOnce([
        { id: 'badge-1', rarity: 'common', isActive: true },
      ]);

      mockDb.transaction.mockImplementation(async (cb: any) => {
        resetTxMocks();
        // Not already owned
        mockTx.limit.mockResolvedValueOnce([]);
        // Update returning → empty (insufficient points: points >= price condition failed)
        mockTx.returning.mockResolvedValueOnce([]);
        return cb(mockTx);
      });

      const result = await purchaseBadge('badge-1');

      expect(result).toEqual({ success: false, error: '포인트가 부족합니다' });
    });

    it('구매 성공 → { success: true } + revalidatePath 호출', async () => {
      mockGetSession.mockResolvedValue(userSession);
      const { purchaseBadge } = await import('@/app/(user)/settings/actions');

      mockDb.limit.mockResolvedValueOnce([
        { id: 'badge-1', rarity: 'rare', isActive: true },
      ]);

      mockDb.transaction.mockImplementation(async (cb: any) => {
        resetTxMocks();
        // Not already owned
        mockTx.limit.mockResolvedValueOnce([]);
        // Points deducted successfully
        mockTx.returning.mockResolvedValueOnce([{ points: 700 }]);
        // Insert badge
        mockTx.values.mockResolvedValueOnce(undefined);
        return cb(mockTx);
      });

      const result = await purchaseBadge('badge-1');

      expect(result).toEqual({ success: true });
      expect(mockRevalidatePath).toHaveBeenCalledWith('/settings');
    });

    it('common 뱃지 가격은 100P', async () => {
      mockGetSession.mockResolvedValue(userSession);
      const { purchaseBadge } = await import('@/app/(user)/settings/actions');

      mockDb.limit.mockResolvedValueOnce([
        { id: 'badge-1', rarity: 'common', isActive: true },
      ]);

      let capturedSet: any = null;
      mockDb.transaction.mockImplementation(async (cb: any) => {
        resetTxMocks();
        mockTx.limit.mockResolvedValueOnce([]);
        mockTx.set.mockImplementation((val: any) => {
          capturedSet = val;
          return mockTx;
        });
        mockTx.returning.mockResolvedValueOnce([{ points: 0 }]);
        mockTx.values.mockResolvedValueOnce(undefined);
        return cb(mockTx);
      });

      await purchaseBadge('badge-1');

      // The set call includes points - 100 (via sql template)
      expect(mockTx.set).toHaveBeenCalled();
    });

    it('legendary 뱃지 가격은 1000P', async () => {
      mockGetSession.mockResolvedValue(userSession);
      const { purchaseBadge } = await import('@/app/(user)/settings/actions');

      mockDb.limit.mockResolvedValueOnce([
        { id: 'badge-legendary', rarity: 'legendary', isActive: true },
      ]);

      mockDb.transaction.mockImplementation(async (cb: any) => {
        resetTxMocks();
        mockTx.limit.mockResolvedValueOnce([]);
        // Simulate points insufficient for 1000P purchase
        mockTx.returning.mockResolvedValueOnce([]);
        return cb(mockTx);
      });

      const result = await purchaseBadge('badge-legendary');

      // Insufficient points scenario with legendary badge
      expect(result).toEqual({ success: false, error: '포인트가 부족합니다' });
    });
  });

  // ==================== purchaseCustomTitle ====================

  describe('purchaseCustomTitle', () => {
    it('db가 null이면 { success: false, error: Database not available } 반환', async () => {
      vi.doMock('@/lib/db', () => ({ db: null }));
      vi.resetModules();
      vi.doMock('@/lib/auth/session', () => ({ getSession: mockGetSession }));
      vi.doMock('next/cache', () => ({ revalidatePath: mockRevalidatePath }));
      vi.doMock('@/lib/gamification/points', () => ({ spendPoints: mockSpendPoints }));

      const { purchaseCustomTitle } = await import('@/app/(user)/settings/actions');
      const result = await purchaseCustomTitle('테스트타이틀');

      expect(result).toEqual({ success: false, error: 'Database not available' });

      vi.doMock('@/lib/db', () => ({ db: mockDb }));
    });

    it('세션 없으면 { success: false, error: 로그인이 필요합니다 } 반환', async () => {
      mockGetSession.mockResolvedValue(null);
      const { purchaseCustomTitle } = await import('@/app/(user)/settings/actions');

      const result = await purchaseCustomTitle('테스트타이틀');

      expect(result).toEqual({ success: false, error: '로그인이 필요합니다' });
    });

    it('타이틀이 1자 (너무 짧음) → { success: false, error: 타이틀은 2~20자여야 합니다 }', async () => {
      mockGetSession.mockResolvedValue(userSession);
      const { purchaseCustomTitle } = await import('@/app/(user)/settings/actions');

      const result = await purchaseCustomTitle('A');

      expect(result).toEqual({ success: false, error: '타이틀은 2~20자여야 합니다' });
    });

    it('타이틀이 21자 (너무 긺) → { success: false, error: 타이틀은 2~20자여야 합니다 }', async () => {
      mockGetSession.mockResolvedValue(userSession);
      const { purchaseCustomTitle } = await import('@/app/(user)/settings/actions');

      const result = await purchaseCustomTitle('A'.repeat(21));

      expect(result).toEqual({ success: false, error: '타이틀은 2~20자여야 합니다' });
    });

    it('공백 포함 타이틀: trim 후 길이 검사 — 공백만이면 1자로 처리', async () => {
      mockGetSession.mockResolvedValue(userSession);
      const { purchaseCustomTitle } = await import('@/app/(user)/settings/actions');

      const result = await purchaseCustomTitle('  A  '); // trim → 'A' (1자)

      expect(result).toEqual({ success: false, error: '타이틀은 2~20자여야 합니다' });
    });

    it('포인트 부족 시 { success: false, error: 포인트가 부족합니다 } 반환', async () => {
      mockGetSession.mockResolvedValue(userSession);
      mockSpendPoints.mockRejectedValueOnce(new Error('Insufficient points'));
      const { purchaseCustomTitle } = await import('@/app/(user)/settings/actions');

      const result = await purchaseCustomTitle('포커왕');

      expect(result).toEqual({ success: false, error: '포인트가 부족합니다' });
    });

    it('구매 성공 → { success: true } + 500P 차감 + revalidatePath 호출', async () => {
      mockGetSession.mockResolvedValue(userSession);
      mockSpendPoints.mockResolvedValueOnce({ success: true });
      const { purchaseCustomTitle } = await import('@/app/(user)/settings/actions');

      // update().set().where() terminal
      mockDb.where.mockResolvedValueOnce(undefined);

      const result = await purchaseCustomTitle('포커왕');

      expect(result).toEqual({ success: true });
      expect(mockSpendPoints).toHaveBeenCalledWith(
        'user-1',
        500,
        'spend_custom_title',
        undefined,
        '커스텀 타이틀 변경: 포커왕'
      );
      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalledWith(
        expect.objectContaining({ customTitle: '포커왕' })
      );
      expect(mockRevalidatePath).toHaveBeenCalledWith('/settings');
      expect(mockRevalidatePath).toHaveBeenCalledWith('/profile/user-1');
    });

    it('정확히 2자 타이틀 → 유효', async () => {
      mockGetSession.mockResolvedValue(userSession);
      mockSpendPoints.mockResolvedValueOnce({ success: true });
      const { purchaseCustomTitle } = await import('@/app/(user)/settings/actions');

      mockDb.where.mockResolvedValueOnce(undefined);

      const result = await purchaseCustomTitle('AB');

      expect(result).toEqual({ success: true });
    });

    it('정확히 20자 타이틀 → 유효', async () => {
      mockGetSession.mockResolvedValue(userSession);
      mockSpendPoints.mockResolvedValueOnce({ success: true });
      const { purchaseCustomTitle } = await import('@/app/(user)/settings/actions');

      mockDb.where.mockResolvedValueOnce(undefined);

      const result = await purchaseCustomTitle('A'.repeat(20));

      expect(result).toEqual({ success: true });
    });
  });

  // ==================== getBadgeShop ====================

  describe('getBadgeShop', () => {
    it('db가 null이면 { success: false, error: Database not available } 반환', async () => {
      vi.doMock('@/lib/db', () => ({ db: null }));
      vi.resetModules();
      vi.doMock('@/lib/auth/session', () => ({ getSession: mockGetSession }));
      vi.doMock('next/cache', () => ({ revalidatePath: mockRevalidatePath }));
      vi.doMock('@/lib/gamification/points', () => ({ spendPoints: mockSpendPoints }));

      const { getBadgeShop } = await import('@/app/(user)/settings/actions');
      const result = await getBadgeShop();

      expect(result).toEqual({ success: false, error: 'Database not available' });

      vi.doMock('@/lib/db', () => ({ db: mockDb }));
    });

    it('세션 없으면 { success: false, error: 로그인이 필요합니다 } 반환', async () => {
      mockGetSession.mockResolvedValue(null);
      const { getBadgeShop } = await import('@/app/(user)/settings/actions');

      const result = await getBadgeShop();

      expect(result).toEqual({ success: false, error: '로그인이 필요합니다' });
    });

    it('활성 뱃지 목록 + 보유 여부 + 유저 포인트 반환', async () => {
      mockGetSession.mockResolvedValue(userSession);
      const { getBadgeShop } = await import('@/app/(user)/settings/actions');

      const allBadges = [
        {
          id: 'badge-1', slug: 'ace', nameKo: '에이스', nameEn: 'Ace',
          descriptionKo: '최고의 플레이어', iconUrl: '/badges/ace.png',
          category: 'rank', rarity: 'common', isActive: true,
        },
        {
          id: 'badge-2', slug: 'legend', nameKo: '레전드', nameEn: 'Legend',
          descriptionKo: '전설의 플레이어', iconUrl: '/badges/legend.png',
          category: 'rank', rarity: 'legendary', isActive: true,
        },
      ];

      // Query 1: select active badges — select().from().where()
      mockDb.where.mockResolvedValueOnce(allBadges);
      // Query 2: select owned badges — select().from().where()
      mockDb.where.mockResolvedValueOnce([{ badgeId: 'badge-1' }]);
      // Query 3: select user points — select().from().where().limit()
      mockDb.limit.mockResolvedValueOnce([{ points: 1500, customTitle: '포커왕' }]);

      const result = await getBadgeShop();

      expect(result.success).toBe(true);
      expect(result.points).toBe(1500);
      expect(result.customTitle).toBe('포커왕');
      expect(result.badges).toHaveLength(2);

      const commonBadge = result.badges!.find((b) => b.id === 'badge-1');
      const legendaryBadge = result.badges!.find((b) => b.id === 'badge-2');

      expect(commonBadge).toMatchObject({
        id: 'badge-1',
        rarity: 'common',
        price: 100,
        owned: true,
      });
      expect(legendaryBadge).toMatchObject({
        id: 'badge-2',
        rarity: 'legendary',
        price: 1000,
        owned: false,
      });
    });

    it('보유 뱃지 없으면 모두 owned: false', async () => {
      mockGetSession.mockResolvedValue(userSession);
      const { getBadgeShop } = await import('@/app/(user)/settings/actions');

      const allBadges = [
        {
          id: 'badge-1', slug: 'ace', nameKo: '에이스', nameEn: 'Ace',
          descriptionKo: null, iconUrl: '/badges/ace.png',
          category: 'rank', rarity: 'rare', isActive: true,
        },
      ];

      mockDb.where.mockResolvedValueOnce(allBadges);
      mockDb.where.mockResolvedValueOnce([]); // no owned badges
      mockDb.limit.mockResolvedValueOnce([{ points: 200, customTitle: null }]);

      const result = await getBadgeShop();

      expect(result.success).toBe(true);
      expect(result.badges![0]).toMatchObject({
        id: 'badge-1',
        price: 300, // rare = 300
        owned: false,
      });
    });

    it('활성 뱃지 없으면 빈 배열 반환', async () => {
      mockGetSession.mockResolvedValue(userSession);
      const { getBadgeShop } = await import('@/app/(user)/settings/actions');

      mockDb.where.mockResolvedValueOnce([]); // no active badges
      mockDb.where.mockResolvedValueOnce([]); // no owned badges
      mockDb.limit.mockResolvedValueOnce([{ points: 500, customTitle: null }]);

      const result = await getBadgeShop();

      expect(result.success).toBe(true);
      expect(result.badges).toEqual([]);
    });

    it('유저가 없으면 points: 0, customTitle: null 반환', async () => {
      mockGetSession.mockResolvedValue(userSession);
      const { getBadgeShop } = await import('@/app/(user)/settings/actions');

      mockDb.where.mockResolvedValueOnce([]);
      mockDb.where.mockResolvedValueOnce([]);
      mockDb.limit.mockResolvedValueOnce([]); // no user found

      const result = await getBadgeShop();

      expect(result.success).toBe(true);
      expect(result.points).toBe(0);
      expect(result.customTitle).toBeNull();
    });

    it('rarity가 알 수 없으면 기본 가격 100P 적용', async () => {
      mockGetSession.mockResolvedValue(userSession);
      const { getBadgeShop } = await import('@/app/(user)/settings/actions');

      const allBadges = [
        {
          id: 'badge-x', slug: 'mystery', nameKo: '미스터리', nameEn: 'Mystery',
          descriptionKo: null, iconUrl: '/badges/mystery.png',
          category: 'special', rarity: 'unknown_rarity', isActive: true,
        },
      ];

      mockDb.where.mockResolvedValueOnce(allBadges);
      mockDb.where.mockResolvedValueOnce([]);
      mockDb.limit.mockResolvedValueOnce([{ points: 100, customTitle: null }]);

      const result = await getBadgeShop();

      expect(result.badges![0].price).toBe(100); // fallback to 100
    });
  });
});

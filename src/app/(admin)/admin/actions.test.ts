import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Mocks ---

const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  offset: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  returning: vi.fn(),
  leftJoin: vi.fn().mockReturnThis(),
  execute: vi.fn(),
};

vi.mock('@/lib/db', () => ({ db: mockDb }));

const mockGetSession = vi.fn();
vi.mock('@/lib/auth/session', () => ({ getSession: mockGetSession }));

const mockAwardPoints = vi.fn();
const mockSpendPoints = vi.fn();
vi.mock('@/lib/gamification/points', () => ({
  awardPoints: mockAwardPoints,
  spendPoints: mockSpendPoints,
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((...args: any[]) => ({ type: 'eq', args })),
  and: vi.fn((...args: any[]) => ({ type: 'and', args })),
  desc: vi.fn((col: any) => ({ type: 'desc', col })),
  sql: Object.assign(vi.fn(), { raw: vi.fn() }),
  like: vi.fn((...args: any[]) => ({ type: 'like', args })),
  or: vi.fn((...args: any[]) => ({ type: 'or', args })),
  gte: vi.fn((...args: any[]) => ({ type: 'gte', args })),
}));

vi.mock('@/lib/db/schema', () => ({
  users: {
    id: 'users.id', nickname: 'users.nickname', email: 'users.email',
    role: 'users.role', status: 'users.status', level: 'users.level',
    points: 'users.points', xp: 'users.xp', createdAt: 'users.createdAt',
    updatedAt: 'users.updatedAt',
  },
  posts: {
    id: 'posts.id', title: 'posts.title', status: 'posts.status',
    viewCount: 'posts.viewCount', likeCount: 'posts.likeCount',
    commentCount: 'posts.commentCount', createdAt: 'posts.createdAt',
    authorId: 'posts.authorId', boardId: 'posts.boardId',
  },
  boards: { id: 'boards.id', nameKo: 'boards.nameKo' },
  pointTransactions: { amount: 'pointTransactions.amount' },
}));

// Helper to reset all mock chains
function resetDbMocks() {
  for (const key of Object.keys(mockDb) as (keyof typeof mockDb)[]) {
    mockDb[key].mockReset();
    if (key !== 'returning' && key !== 'execute') {
      mockDb[key].mockReturnThis();
    }
  }
}

const adminSession = { userId: 'admin-1', email: 'admin@test.com', nickname: 'Admin', role: 'admin' };
const userSession = { userId: 'user-1', email: 'user@test.com', nickname: 'User', role: 'user' };

describe('Admin Actions', () => {
  beforeEach(() => {
    vi.resetModules();
    resetDbMocks();
    mockGetSession.mockReset();
    mockAwardPoints.mockReset();
    mockSpendPoints.mockReset();
  });

  // ==================== requireAdmin ====================

  describe('requireAdmin (getAdminDashboard를 통해 테스트)', () => {
    it('세션이 없으면 에러 throw', async () => {
      mockGetSession.mockResolvedValue(null);
      const { getAdminDashboard } = await import('@/app/(admin)/admin/actions');

      await expect(getAdminDashboard()).rejects.toThrow('관리자 권한이 필요합니다');
    });

    it('role이 admin이 아니면 에러 throw', async () => {
      mockGetSession.mockResolvedValue(userSession);
      const { getAdminDashboard } = await import('@/app/(admin)/admin/actions');

      await expect(getAdminDashboard()).rejects.toThrow('관리자 권한이 필요합니다');
    });
  });

  // ==================== getAdminDashboard ====================

  describe('getAdminDashboard', () => {
    it('대시보드 통계 반환: totalUsers, todaySignups, totalPosts, activeUsers, recentUsers', async () => {
      mockGetSession.mockResolvedValue(adminSession);
      const { getAdminDashboard } = await import('@/app/(admin)/admin/actions');

      // Chain: select().from() for counts (4 times) + select().from().orderBy().limit() for recentUsers
      // Each count query resolves from the last .from() call
      mockDb.from
        .mockResolvedValueOnce([{ count: 100 }])   // totalUsers
        .mockReturnValueOnce(mockDb);               // todaySignups: needs .where()
      mockDb.where
        .mockResolvedValueOnce([{ count: 5 }]);     // todaySignups
      mockDb.from
        .mockResolvedValueOnce([{ count: 200 }]);   // totalPosts
      mockDb.from
        .mockReturnValueOnce(mockDb);               // activeUsers: needs .where()
      mockDb.where
        .mockResolvedValueOnce([{ count: 42 }]);    // activeUsers

      const recentUsers = [
        { id: 'u1', nickname: 'Alice', email: 'a@b.com', role: 'user', status: 'active', level: 3, points: 100, createdAt: new Date() },
      ];
      mockDb.limit.mockResolvedValueOnce(recentUsers);

      const result = await getAdminDashboard();

      expect(result).toEqual({
        totalUsers: 100,
        todaySignups: 5,
        totalPosts: 200,
        activeUsers: 42,
        recentUsers,
      });
    });

    it('db가 null이면 기본값 반환', async () => {
      mockGetSession.mockResolvedValue(adminSession);
      vi.doMock('@/lib/db', () => ({ db: null }));
      vi.resetModules();
      // Re-mock dependencies after resetModules
      vi.doMock('@/lib/auth/session', () => ({ getSession: mockGetSession }));
      vi.doMock('@/lib/gamification/points', () => ({ awardPoints: mockAwardPoints, spendPoints: mockSpendPoints }));

      const { getAdminDashboard } = await import('@/app/(admin)/admin/actions');
      const result = await getAdminDashboard();

      expect(result).toEqual({
        totalUsers: 0,
        todaySignups: 0,
        totalPosts: 0,
        activeUsers: 0,
        recentUsers: [],
      });

      // Restore db mock
      vi.doMock('@/lib/db', () => ({ db: mockDb }));
    });
  });

  // ==================== getAdminUsers ====================

  describe('getAdminUsers', () => {
    // getAdminUsers chain: select().from(users).where(conditions).orderBy().limit().offset()
    // First .where() is mid-chain (returns this), .offset() is terminal for list query
    // Second chain: select().from(users).where(conditions) is terminal for count query

    it('페이지네이션: offset 계산 (page=2, limit=20 → offset=20)', async () => {
      mockGetSession.mockResolvedValue(adminSession);
      const { getAdminUsers } = await import('@/app/(admin)/admin/actions');

      const userList = [{ id: 'u1', nickname: 'Alice' }];
      // First chain: .where() mid-chain returns this, terminal is .offset()
      mockDb.offset.mockResolvedValueOnce(userList);
      // Second chain (count): select().from() returns this, terminal .where()
      mockDb.where
        .mockReturnValueOnce(mockDb)      // first .where() mid-chain
        .mockResolvedValueOnce([{ count: 50 }]); // count query terminal .where()

      const result = await getAdminUsers(2, 20);

      expect(mockDb.offset).toHaveBeenCalledWith(20);
      expect(result.pagination).toEqual({
        page: 2,
        limit: 20,
        total: 50,
        totalPages: 3,
      });
    });

    it('검색 필터: search 파라미터 적용', async () => {
      mockGetSession.mockResolvedValue(adminSession);
      const { getAdminUsers } = await import('@/app/(admin)/admin/actions');

      mockDb.offset.mockResolvedValueOnce([]);
      mockDb.where
        .mockReturnValueOnce(mockDb)      // first .where() mid-chain
        .mockResolvedValueOnce([{ count: 0 }]); // count query terminal

      const result = await getAdminUsers(1, 20, 'testuser');

      expect(result.users).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });

    it('검색 없이 전체 목록 반환', async () => {
      mockGetSession.mockResolvedValue(adminSession);
      const { getAdminUsers } = await import('@/app/(admin)/admin/actions');

      const userList = [
        { id: 'u1', nickname: 'Alice', email: 'a@b.com', role: 'user', status: 'active', level: 1, points: 0, xp: 0, createdAt: new Date() },
      ];
      mockDb.offset.mockResolvedValueOnce(userList);
      mockDb.where
        .mockReturnValueOnce(mockDb)      // first .where() mid-chain
        .mockResolvedValueOnce([{ count: 1 }]); // count query terminal

      const result = await getAdminUsers(1, 20);

      expect(result.users).toEqual(userList);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      });
    });
  });

  // ==================== updateUserRole ====================

  describe('updateUserRole', () => {
    it('자신의 역할 변경 시도 → 에러 throw', async () => {
      mockGetSession.mockResolvedValue(adminSession);
      const { updateUserRole } = await import('@/app/(admin)/admin/actions');

      await expect(updateUserRole('admin-1', 'moderator')).rejects.toThrow('자신의 역할은 변경할 수 없습니다');
    });

    it('다른 유저 역할 변경 → success: true', async () => {
      mockGetSession.mockResolvedValue(adminSession);
      const { updateUserRole } = await import('@/app/(admin)/admin/actions');

      mockDb.where.mockResolvedValueOnce(undefined);

      const result = await updateUserRole('user-2', 'moderator');
      expect(result).toEqual({ success: true });
      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalled();
    });

    it('admin이 아니면 에러 throw', async () => {
      mockGetSession.mockResolvedValue(userSession);
      const { updateUserRole } = await import('@/app/(admin)/admin/actions');

      await expect(updateUserRole('user-2', 'admin')).rejects.toThrow('관리자 권한이 필요합니다');
    });
  });

  // ==================== adjustUserPoints ====================

  describe('adjustUserPoints', () => {
    it('amount=0 → 에러 throw', async () => {
      mockGetSession.mockResolvedValue(adminSession);
      const { adjustUserPoints } = await import('@/app/(admin)/admin/actions');

      await expect(adjustUserPoints('user-2', 0, 'test')).rejects.toThrow('금액은 0이 될 수 없습니다');
    });

    it('양수 amount → awardPoints 호출', async () => {
      mockGetSession.mockResolvedValue(adminSession);
      mockAwardPoints.mockResolvedValue({ success: true });
      const { adjustUserPoints } = await import('@/app/(admin)/admin/actions');

      await adjustUserPoints('user-2', 500, '보너스');

      expect(mockAwardPoints).toHaveBeenCalledWith('user-2', 500, 'admin_adjust', undefined, '보너스');
      expect(mockSpendPoints).not.toHaveBeenCalled();
    });

    it('음수 amount → spendPoints 호출 (절대값 전달)', async () => {
      mockGetSession.mockResolvedValue(adminSession);
      mockSpendPoints.mockResolvedValue({ success: true });
      const { adjustUserPoints } = await import('@/app/(admin)/admin/actions');

      await adjustUserPoints('user-2', -300, '패널티');

      expect(mockSpendPoints).toHaveBeenCalledWith('user-2', 300, 'admin_adjust', undefined, '패널티');
      expect(mockAwardPoints).not.toHaveBeenCalled();
    });
  });

  // ==================== toggleUserBan ====================

  describe('toggleUserBan', () => {
    it('자신을 정지 시도 → 에러 throw', async () => {
      mockGetSession.mockResolvedValue(adminSession);
      const { toggleUserBan } = await import('@/app/(admin)/admin/actions');

      await expect(toggleUserBan('admin-1')).rejects.toThrow('자신을 정지할 수 없습니다');
    });

    it('active 유저 → suspended로 토글', async () => {
      mockGetSession.mockResolvedValue(adminSession);
      const { toggleUserBan } = await import('@/app/(admin)/admin/actions');

      // select user status
      mockDb.where.mockResolvedValueOnce([{ status: 'active' }]);
      // update
      mockDb.where.mockResolvedValueOnce(undefined);

      const result = await toggleUserBan('user-2');
      expect(result).toEqual({ success: true, newStatus: 'suspended' });
    });

    it('suspended 유저 → active로 토글', async () => {
      mockGetSession.mockResolvedValue(adminSession);
      const { toggleUserBan } = await import('@/app/(admin)/admin/actions');

      mockDb.where.mockResolvedValueOnce([{ status: 'suspended' }]);
      mockDb.where.mockResolvedValueOnce(undefined);

      const result = await toggleUserBan('user-2');
      expect(result).toEqual({ success: true, newStatus: 'active' });
    });

    it('존재하지 않는 유저 → 에러 throw', async () => {
      mockGetSession.mockResolvedValue(adminSession);
      const { toggleUserBan } = await import('@/app/(admin)/admin/actions');

      mockDb.where.mockResolvedValueOnce([]);

      await expect(toggleUserBan('nonexistent')).rejects.toThrow('유저를 찾을 수 없습니다');
    });
  });

  // ==================== getAdminPosts ====================

  describe('getAdminPosts', () => {
    // getAdminPosts chain: select().from(posts).leftJoin().leftJoin().where(conditions).orderBy().limit().offset()
    // First .where() is mid-chain (returns this), .offset() is terminal for list query
    // Second chain: select().from(posts).where(conditions) is terminal for count query

    it('게시물 목록 + 페이지네이션 반환', async () => {
      mockGetSession.mockResolvedValue(adminSession);
      const { getAdminPosts } = await import('@/app/(admin)/admin/actions');

      const postList = [
        {
          id: 'p1', title: '테스트 글', status: 'published',
          viewCount: 10, likeCount: 5, commentCount: 3,
          createdAt: new Date(), authorNickname: 'Alice', boardName: '자유게시판',
        },
      ];
      mockDb.offset.mockResolvedValueOnce(postList);
      mockDb.where
        .mockReturnValueOnce(mockDb)      // first .where() mid-chain
        .mockResolvedValueOnce([{ count: 1 }]); // count query terminal

      const result = await getAdminPosts(1, 20);

      expect(result.posts).toEqual(postList);
      expect(result.pagination).toEqual({ page: 1, limit: 20, total: 1, totalPages: 1 });
    });

    it('검색 필터 적용', async () => {
      mockGetSession.mockResolvedValue(adminSession);
      const { getAdminPosts } = await import('@/app/(admin)/admin/actions');

      mockDb.offset.mockResolvedValueOnce([]);
      mockDb.where
        .mockReturnValueOnce(mockDb)      // first .where() mid-chain
        .mockResolvedValueOnce([{ count: 0 }]); // count query terminal

      const result = await getAdminPosts(1, 10, '검색어');

      expect(result.posts).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });

    it('leftJoin으로 author와 board 포함', async () => {
      mockGetSession.mockResolvedValue(adminSession);
      const { getAdminPosts } = await import('@/app/(admin)/admin/actions');

      mockDb.offset.mockResolvedValueOnce([]);
      mockDb.where
        .mockReturnValueOnce(mockDb)      // first .where() mid-chain
        .mockResolvedValueOnce([{ count: 0 }]); // count query terminal

      await getAdminPosts(1, 20);

      // leftJoin is called twice (users + boards)
      expect(mockDb.leftJoin).toHaveBeenCalledTimes(2);
    });
  });

  // ==================== deleteAdminPost ====================

  describe('deleteAdminPost', () => {
    it('소프트 삭제: status를 deleted로 설정', async () => {
      mockGetSession.mockResolvedValue(adminSession);
      const { deleteAdminPost } = await import('@/app/(admin)/admin/actions');

      mockDb.where.mockResolvedValueOnce(undefined);

      const result = await deleteAdminPost('post-1');

      expect(result).toEqual({ success: true });
      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'deleted' })
      );
    });

    it('admin이 아니면 에러 throw', async () => {
      mockGetSession.mockResolvedValue(userSession);
      const { deleteAdminPost } = await import('@/app/(admin)/admin/actions');

      await expect(deleteAdminPost('post-1')).rejects.toThrow('관리자 권한이 필요합니다');
    });
  });

  // ==================== getAdminStats ====================

  describe('getAdminStats', () => {
    it('dailySignups, dailyPosts, pointEconomy 반환', async () => {
      mockGetSession.mockResolvedValue(adminSession);
      const { getAdminStats } = await import('@/app/(admin)/admin/actions');

      const signupRows = [{ date: '2026-02-18', count: 3 }];
      const postRows = [{ date: '2026-02-18', count: 10 }];

      // execute calls for dailySignups and dailyPosts
      mockDb.execute
        .mockResolvedValueOnce({ rows: signupRows })
        .mockResolvedValueOnce({ rows: postRows });

      // totalCirculation
      mockDb.from.mockResolvedValueOnce([{ total: 50000 }]);
      // totalEarned
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockResolvedValueOnce([{ total: 80000 }]);
      // totalSpent
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockResolvedValueOnce([{ total: 30000 }]);

      const result = await getAdminStats();

      expect(result).toEqual({
        dailySignups: signupRows,
        dailyPosts: postRows,
        pointEconomy: {
          totalCirculation: 50000,
          totalEarned: 80000,
          totalSpent: 30000,
        },
      });
    });

    it('db가 null이면 기본값 반환', async () => {
      mockGetSession.mockResolvedValue(adminSession);
      vi.doMock('@/lib/db', () => ({ db: null }));
      vi.resetModules();
      vi.doMock('@/lib/auth/session', () => ({ getSession: mockGetSession }));
      vi.doMock('@/lib/gamification/points', () => ({ awardPoints: mockAwardPoints, spendPoints: mockSpendPoints }));

      const { getAdminStats } = await import('@/app/(admin)/admin/actions');
      const result = await getAdminStats();

      expect(result).toEqual({
        dailySignups: [],
        dailyPosts: [],
        pointEconomy: { totalCirculation: 0, totalEarned: 0, totalSpent: 0 },
      });

      vi.doMock('@/lib/db', () => ({ db: mockDb }));
    });
  });
});

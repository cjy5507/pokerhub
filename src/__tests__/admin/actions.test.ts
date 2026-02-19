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
    updatedAt: 'posts.updatedAt', authorId: 'posts.authorId', boardId: 'posts.boardId',
  },
  boards: { id: 'boards.id', nameKo: 'boards.nameKo' },
  pointTransactions: { amount: 'pointTransactions.amount' },
}));

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

  // ==================== requireAdmin guard ====================

  describe('requireAdmin (via getAdminDashboard)', () => {
    it('세션이 없으면 관리자 권한 에러 throw', async () => {
      mockGetSession.mockResolvedValue(null);
      const { getAdminDashboard } = await import('@/app/(admin)/admin/actions');

      await expect(getAdminDashboard()).rejects.toThrow('관리자 권한이 필요합니다');
    });

    it('role이 admin이 아니면 관리자 권한 에러 throw', async () => {
      mockGetSession.mockResolvedValue(userSession);
      const { getAdminDashboard } = await import('@/app/(admin)/admin/actions');

      await expect(getAdminDashboard()).rejects.toThrow('관리자 권한이 필요합니다');
    });
  });

  // ==================== updateUserRole ====================

  describe('updateUserRole', () => {
    it('자신의 역할 변경 시도 → 에러 throw', async () => {
      mockGetSession.mockResolvedValue(adminSession);
      const { updateUserRole } = await import('@/app/(admin)/admin/actions');

      await expect(updateUserRole('admin-1', 'moderator')).rejects.toThrow(
        '자신의 역할은 변경할 수 없습니다'
      );
    });

    it('admin이 아니면 에러 throw', async () => {
      mockGetSession.mockResolvedValue(userSession);
      const { updateUserRole } = await import('@/app/(admin)/admin/actions');

      await expect(updateUserRole('user-2', 'admin')).rejects.toThrow(
        '관리자 권한이 필요합니다'
      );
    });

    it('다른 유저 역할 변경 성공 → success: true', async () => {
      mockGetSession.mockResolvedValue(adminSession);
      const { updateUserRole } = await import('@/app/(admin)/admin/actions');

      // update().set().where() terminal
      mockDb.where.mockResolvedValueOnce(undefined);

      const result = await updateUserRole('user-2', 'moderator');

      expect(result).toEqual({ success: true });
      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'moderator' })
      );
    });
  });

  // ==================== toggleUserBan ====================

  describe('toggleUserBan', () => {
    it('자신을 정지 시도 → 에러 throw', async () => {
      mockGetSession.mockResolvedValue(adminSession);
      const { toggleUserBan } = await import('@/app/(admin)/admin/actions');

      await expect(toggleUserBan('admin-1')).rejects.toThrow('자신을 정지할 수 없습니다');
    });

    it('admin이 아니면 에러 throw', async () => {
      mockGetSession.mockResolvedValue(userSession);
      const { toggleUserBan } = await import('@/app/(admin)/admin/actions');

      await expect(toggleUserBan('user-2')).rejects.toThrow('관리자 권한이 필요합니다');
    });

    it('active 유저 → suspended로 토글', async () => {
      mockGetSession.mockResolvedValue(adminSession);
      const { toggleUserBan } = await import('@/app/(admin)/admin/actions');

      // select().from().where() → user with status active
      mockDb.where.mockResolvedValueOnce([{ status: 'active' }]);
      // update().set().where() terminal
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

  // ==================== adjustUserPoints ====================

  describe('adjustUserPoints', () => {
    it('amount=0 → 에러 throw', async () => {
      mockGetSession.mockResolvedValue(adminSession);
      const { adjustUserPoints } = await import('@/app/(admin)/admin/actions');

      await expect(adjustUserPoints('user-2', 0, '테스트')).rejects.toThrow(
        '금액은 0이 될 수 없습니다'
      );
    });

    it('admin이 아니면 에러 throw', async () => {
      mockGetSession.mockResolvedValue(userSession);
      const { adjustUserPoints } = await import('@/app/(admin)/admin/actions');

      await expect(adjustUserPoints('user-2', 100, '테스트')).rejects.toThrow(
        '관리자 권한이 필요합니다'
      );
    });

    it('양수 amount → awardPoints 호출 (spendPoints 미호출)', async () => {
      mockGetSession.mockResolvedValue(adminSession);
      mockAwardPoints.mockResolvedValue({ success: true });
      const { adjustUserPoints } = await import('@/app/(admin)/admin/actions');

      await adjustUserPoints('user-2', 500, '보너스');

      expect(mockAwardPoints).toHaveBeenCalledWith(
        'user-2', 500, 'admin_adjust', undefined, '보너스'
      );
      expect(mockSpendPoints).not.toHaveBeenCalled();
    });

    it('음수 amount → spendPoints 호출 with 절대값 (awardPoints 미호출)', async () => {
      mockGetSession.mockResolvedValue(adminSession);
      mockSpendPoints.mockResolvedValue({ success: true });
      const { adjustUserPoints } = await import('@/app/(admin)/admin/actions');

      await adjustUserPoints('user-2', -300, '패널티');

      expect(mockSpendPoints).toHaveBeenCalledWith(
        'user-2', 300, 'admin_adjust', undefined, '패널티'
      );
      expect(mockAwardPoints).not.toHaveBeenCalled();
    });
  });

  // ==================== deleteAdminPost ====================

  describe('deleteAdminPost', () => {
    it('admin이 아니면 에러 throw', async () => {
      mockGetSession.mockResolvedValue(userSession);
      const { deleteAdminPost } = await import('@/app/(admin)/admin/actions');

      await expect(deleteAdminPost('post-1')).rejects.toThrow('관리자 권한이 필요합니다');
    });

    it('소프트 삭제: status를 deleted로 설정 → success: true', async () => {
      mockGetSession.mockResolvedValue(adminSession);
      const { deleteAdminPost } = await import('@/app/(admin)/admin/actions');

      // update().set().where() terminal
      mockDb.where.mockResolvedValueOnce(undefined);

      const result = await deleteAdminPost('post-1');

      expect(result).toEqual({ success: true });
      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'deleted' })
      );
    });
  });
});

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
  leftJoin: vi.fn().mockReturnThis(),
};

vi.mock('@/lib/db', () => ({ db: mockDb }));

const mockGetSession = vi.fn();
vi.mock('@/lib/auth/session', () => ({ getSession: mockGetSession }));

const mockRevalidatePath = vi.fn();
vi.mock('next/cache', () => ({ revalidatePath: mockRevalidatePath }));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((...args: any[]) => ({ type: 'eq', args })),
  and: vi.fn((...args: any[]) => ({ type: 'and', args })),
  desc: vi.fn((col: any) => ({ type: 'desc', col })),
  count: vi.fn(() => ({ type: 'count' })),
}));

vi.mock('@/lib/db/schema', () => ({
  notifications: {
    id: 'notifications.id',
    userId: 'notifications.userId',
    type: 'notifications.type',
    title: 'notifications.title',
    body: 'notifications.body',
    link: 'notifications.link',
    isRead: 'notifications.isRead',
    actorId: 'notifications.actorId',
    createdAt: 'notifications.createdAt',
  },
  users: {
    id: 'users.id',
    nickname: 'users.nickname',
    avatarUrl: 'users.avatarUrl',
  },
}));

function resetDbMocks() {
  for (const key of Object.keys(mockDb) as (keyof typeof mockDb)[]) {
    mockDb[key].mockReset();
    mockDb[key].mockReturnThis();
  }
}

const userSession = { userId: 'user-1', email: 'user@test.com', nickname: 'User', role: 'user' };

describe('Notifications Actions', () => {
  beforeEach(() => {
    vi.resetModules();
    resetDbMocks();
    mockGetSession.mockReset();
    mockRevalidatePath.mockReset();
  });

  // ==================== getNotifications ====================

  describe('getNotifications', () => {
    it('세션 없으면 Unauthorized 에러 throw', async () => {
      mockGetSession.mockResolvedValue(null);
      const { getNotifications } = await import('@/app/notifications/actions');

      await expect(getNotifications()).rejects.toThrow('Unauthorized');
    });

    it('db가 null이면 기본값 반환', async () => {
      mockGetSession.mockResolvedValue(userSession);
      vi.doMock('@/lib/db', () => ({ db: null }));
      vi.resetModules();
      vi.doMock('@/lib/auth/session', () => ({ getSession: mockGetSession }));
      vi.doMock('next/cache', () => ({ revalidatePath: mockRevalidatePath }));

      const { getNotifications } = await import('@/app/notifications/actions');
      const result = await getNotifications();

      expect(result).toEqual({ notifications: [], hasMore: false, unreadCount: 0 });

      vi.doMock('@/lib/db', () => ({ db: mockDb }));
    });

    it('페이지네이션된 알림 목록과 unreadCount 반환', async () => {
      mockGetSession.mockResolvedValue(userSession);
      const { getNotifications } = await import('@/app/notifications/actions');

      const createdAt = new Date('2026-02-18T10:00:00Z');

      // First query chain: select().from().leftJoin().where().orderBy().limit().offset()
      // where() is mid-chain → returns this; terminal is offset()
      mockDb.where.mockReturnValueOnce(mockDb); // first .where() mid-chain for list query
      mockDb.offset.mockResolvedValueOnce([
        {
          id: 'n1',
          type: 'comment',
          title: '댓글이 달렸습니다',
          body: null,
          link: '/posts/1',
          isRead: false,
          createdAt,
          actorId: 'actor-1',
          actorNickname: 'Alice',
          actorAvatarUrl: null,
        },
      ]);

      // Second query chain: select().from().where() → terminal for unread count
      mockDb.where.mockResolvedValueOnce([{ count: 3 }]);

      const result = await getNotifications(1, 20);

      expect(result.hasMore).toBe(false);
      expect(result.unreadCount).toBe(3);
      expect(result.notifications).toHaveLength(1);
      expect(result.notifications[0]).toMatchObject({
        id: 'n1',
        type: 'comment',
        title: '댓글이 달렸습니다',
        isRead: false,
        actor: { id: 'actor-1', nickname: 'Alice', avatarUrl: null },
        createdAt: createdAt.toISOString(),
      });
    });

    it('limit+1개 반환 시 hasMore: true', async () => {
      mockGetSession.mockResolvedValue(userSession);
      const { getNotifications } = await import('@/app/notifications/actions');

      // Return 21 items when limit=20 → hasMore should be true
      const items = Array.from({ length: 21 }, (_, i) => ({
        id: `n${i}`,
        type: 'system',
        title: `알림 ${i}`,
        body: null,
        link: null,
        isRead: true,
        createdAt: new Date(),
        actorId: null,
        actorNickname: null,
        actorAvatarUrl: null,
      }));
      mockDb.where.mockReturnValueOnce(mockDb); // first .where() mid-chain for list query
      mockDb.offset.mockResolvedValueOnce(items);
      mockDb.where.mockResolvedValueOnce([{ count: 0 }]); // unread count query

      const result = await getNotifications(1, 20);

      expect(result.hasMore).toBe(true);
      expect(result.notifications).toHaveLength(20);
    });

    it('actor가 없으면 actor: null로 포맷', async () => {
      mockGetSession.mockResolvedValue(userSession);
      const { getNotifications } = await import('@/app/notifications/actions');

      mockDb.where.mockReturnValueOnce(mockDb); // first .where() mid-chain for list query
      mockDb.offset.mockResolvedValueOnce([
        {
          id: 'n1',
          type: 'system',
          title: '시스템 알림',
          body: '내용',
          link: null,
          isRead: false,
          createdAt: new Date(),
          actorId: null,
          actorNickname: null,
          actorAvatarUrl: null,
        },
      ]);
      mockDb.where.mockResolvedValueOnce([{ count: 1 }]); // unread count query

      const result = await getNotifications();

      expect(result.notifications[0].actor).toBeNull();
    });
  });

  // ==================== getUnreadCount ====================

  describe('getUnreadCount', () => {
    it('세션 없으면 { count: 0 } 반환 (throw 아님)', async () => {
      mockGetSession.mockResolvedValue(null);
      const { getUnreadCount } = await import('@/app/notifications/actions');

      const result = await getUnreadCount();

      expect(result).toEqual({ count: 0 });
    });

    it('db가 null이면 { count: 0 } 반환', async () => {
      mockGetSession.mockResolvedValue(userSession);
      vi.doMock('@/lib/db', () => ({ db: null }));
      vi.resetModules();
      vi.doMock('@/lib/auth/session', () => ({ getSession: mockGetSession }));
      vi.doMock('next/cache', () => ({ revalidatePath: mockRevalidatePath }));

      const { getUnreadCount } = await import('@/app/notifications/actions');
      const result = await getUnreadCount();

      expect(result).toEqual({ count: 0 });

      vi.doMock('@/lib/db', () => ({ db: mockDb }));
    });

    it('세션 있으면 실제 미읽음 count 반환', async () => {
      mockGetSession.mockResolvedValue(userSession);
      const { getUnreadCount } = await import('@/app/notifications/actions');

      // select({ count }).from().where()
      mockDb.where.mockResolvedValueOnce([{ count: 7 }]);

      const result = await getUnreadCount();

      expect(result).toEqual({ count: 7 });
    });
  });

  // ==================== markAsRead ====================

  describe('markAsRead', () => {
    it('세션 없으면 Unauthorized 에러 throw', async () => {
      mockGetSession.mockResolvedValue(null);
      const { markAsRead } = await import('@/app/notifications/actions');

      await expect(markAsRead('n-1')).rejects.toThrow('Unauthorized');
    });

    it('단일 알림을 isRead: true로 업데이트', async () => {
      mockGetSession.mockResolvedValue(userSession);
      const { markAsRead } = await import('@/app/notifications/actions');

      // update().set().where() terminal
      mockDb.where.mockResolvedValueOnce(undefined);

      await markAsRead('n-1');

      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalledWith({ isRead: true });
      expect(mockRevalidatePath).toHaveBeenCalledWith('/notifications');
    });
  });

  // ==================== markAllAsRead ====================

  describe('markAllAsRead', () => {
    it('세션 없으면 Unauthorized 에러 throw', async () => {
      mockGetSession.mockResolvedValue(null);
      const { markAllAsRead } = await import('@/app/notifications/actions');

      await expect(markAllAsRead()).rejects.toThrow('Unauthorized');
    });

    it('해당 유저의 모든 미읽음 알림을 isRead: true로 업데이트', async () => {
      mockGetSession.mockResolvedValue(userSession);
      const { markAllAsRead } = await import('@/app/notifications/actions');

      // update().set().where() terminal
      mockDb.where.mockResolvedValueOnce(undefined);

      await markAllAsRead();

      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalledWith({ isRead: true });
      expect(mockRevalidatePath).toHaveBeenCalledWith('/notifications');
    });
  });

  // ==================== deleteNotification ====================

  describe('deleteNotification', () => {
    it('세션 없으면 Unauthorized 에러 throw', async () => {
      mockGetSession.mockResolvedValue(null);
      const { deleteNotification } = await import('@/app/notifications/actions');

      await expect(deleteNotification('n-1')).rejects.toThrow('Unauthorized');
    });

    it('소유 확인 후 알림 삭제 + revalidatePath 호출', async () => {
      mockGetSession.mockResolvedValue(userSession);
      const { deleteNotification } = await import('@/app/notifications/actions');

      // delete().where() terminal
      mockDb.where.mockResolvedValueOnce(undefined);

      await deleteNotification('n-1');

      expect(mockDb.delete).toHaveBeenCalled();
      expect(mockRevalidatePath).toHaveBeenCalledWith('/notifications');
    });
  });

  // ==================== createNotification ====================

  describe('createNotification', () => {
    it('db가 null이면 아무것도 하지 않음', async () => {
      vi.doMock('@/lib/db', () => ({ db: null }));
      vi.resetModules();
      vi.doMock('@/lib/auth/session', () => ({ getSession: mockGetSession }));
      vi.doMock('next/cache', () => ({ revalidatePath: mockRevalidatePath }));

      const { createNotification } = await import('@/app/notifications/actions');
      await createNotification({
        userId: 'user-1',
        type: 'comment',
        title: '테스트',
      });

      // No db calls should be made
      expect(mockDb.insert).not.toHaveBeenCalled();

      vi.doMock('@/lib/db', () => ({ db: mockDb }));
    });

    it('알림 레코드 생성 + revalidatePath 호출', async () => {
      const { createNotification } = await import('@/app/notifications/actions');

      // insert().values() terminal
      mockDb.values.mockResolvedValueOnce(undefined);

      await createNotification({
        userId: 'user-2',
        type: 'like',
        title: '좋아요를 받았습니다',
        body: '게시물에 좋아요가 달렸습니다',
        link: '/posts/42',
        actorId: 'actor-1',
      });

      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.values).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-2',
          type: 'like',
          title: '좋아요를 받았습니다',
          actorId: 'actor-1',
        })
      );
      expect(mockRevalidatePath).toHaveBeenCalledWith('/notifications');
    });

    it('actorId 없이 시스템 알림 생성', async () => {
      const { createNotification } = await import('@/app/notifications/actions');

      mockDb.values.mockResolvedValueOnce(undefined);

      await createNotification({
        userId: 'user-2',
        type: 'system',
        title: '시스템 공지',
      });

      expect(mockDb.values).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-2',
          type: 'system',
          actorId: undefined,
        })
      );
    });
  });
});

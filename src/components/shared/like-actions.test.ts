import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Mocks ---

const mockTx = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  returning: vi.fn(),
};

const mockDb = {
  transaction: vi.fn(),
};

vi.mock('@/lib/db', () => ({ db: mockDb }));
vi.mock('@/lib/auth/session', () => ({ getSession: vi.fn() }));
vi.mock('drizzle-orm', () => ({
  eq: vi.fn((...args: any[]) => ({ type: 'eq', args })),
  and: vi.fn((...args: any[]) => ({ type: 'and', args })),
  sql: vi.fn(),
}));
vi.mock('@/lib/db/schema', () => ({
  posts: { id: 'posts.id', likeCount: 'posts.likeCount' },
  postLikes: { userId: 'postLikes.userId', postId: 'postLikes.postId' },
  comments: { id: 'comments.id', likeCount: 'comments.likeCount' },
  commentLikes: { userId: 'commentLikes.userId', commentId: 'commentLikes.commentId' },
  pokerHands: { id: 'pokerHands.id', likeCount: 'pokerHands.likeCount' },
  pokerHandLikes: { userId: 'pokerHandLikes.userId', handId: 'pokerHandLikes.handId' },
  threads: { id: 'threads.id', likesCount: 'threads.likesCount' },
  threadLikes: { userId: 'threadLikes.userId', threadId: 'threadLikes.threadId' },
}));

import { getSession } from '@/lib/auth/session';

const mockedGetSession = vi.mocked(getSession);

// Helper: configure transaction to invoke callback with mockTx
function setupTransaction() {
  mockDb.transaction.mockImplementation(async (cb: any) => cb(mockTx));
}

// Helper: reset all mockTx chain methods
function resetTx() {
  for (const key of Object.keys(mockTx) as (keyof typeof mockTx)[]) {
    mockTx[key].mockReset();
    if (key !== 'returning') {
      mockTx[key].mockReturnThis();
    }
  }
}

describe('toggleLike', () => {
  beforeEach(() => {
    vi.resetModules();
    resetTx();
    mockedGetSession.mockReset();
    mockDb.transaction.mockReset();
  });

  // ==================== Guard clauses ====================

  it('db가 null이면 Database unavailable 반환', async () => {
    // Temporarily override db to null
    const dbModule = await import('@/lib/db');
    const origDb = dbModule.db;
    (dbModule as any).db = null;

    // Re-import to pick up the null db
    vi.resetModules();
    vi.doMock('@/lib/db', () => ({ db: null }));
    const { toggleLike } = await import('@/components/shared/like-actions');

    const result = await toggleLike('post-1', 'post');
    expect(result).toEqual({
      success: false,
      isLiked: false,
      likeCount: 0,
      error: 'Database unavailable',
    });

    // Restore
    vi.doMock('@/lib/db', () => ({ db: mockDb }));
  });

  it('세션이 없으면 Unauthorized 반환', async () => {
    vi.doMock('@/lib/db', () => ({ db: mockDb }));
    vi.doMock('@/lib/auth/session', () => ({ getSession: vi.fn().mockResolvedValue(null) }));
    const { toggleLike } = await import('@/components/shared/like-actions');

    const result = await toggleLike('post-1', 'post');
    expect(result).toEqual({
      success: false,
      isLiked: false,
      likeCount: 0,
      error: 'Unauthorized',
    });
  });

  // ==================== Post like/unlike ====================

  describe('post 좋아요', () => {
    it('처음 좋아요 → insert + increment → isLiked: true', async () => {
      vi.doMock('@/lib/db', () => ({ db: mockDb }));
      vi.doMock('@/lib/auth/session', () => ({
        getSession: vi.fn().mockResolvedValue({ userId: 'user-1', email: 'a@b.com', nickname: 'test', role: 'user' }),
      }));
      const { toggleLike } = await import('@/components/shared/like-actions');

      mockDb.transaction.mockImplementation(async (cb: any) => {
        resetTx();
        // select existing → empty (no prior like)
        mockTx.where.mockResolvedValueOnce([]);
        // insert → ok
        mockTx.values.mockResolvedValueOnce(undefined);
        // update returning
        mockTx.returning.mockResolvedValueOnce([{ likeCount: 5 }]);
        return cb(mockTx);
      });

      const result = await toggleLike('post-1', 'post');
      expect(result).toEqual({ success: true, isLiked: true, likeCount: 5 });
    });

    it('이미 좋아요 → delete + decrement → isLiked: false', async () => {
      vi.doMock('@/lib/db', () => ({ db: mockDb }));
      vi.doMock('@/lib/auth/session', () => ({
        getSession: vi.fn().mockResolvedValue({ userId: 'user-1', email: 'a@b.com', nickname: 'test', role: 'user' }),
      }));
      const { toggleLike } = await import('@/components/shared/like-actions');

      mockDb.transaction.mockImplementation(async (cb: any) => {
        resetTx();
        // select existing → found
        mockTx.where.mockResolvedValueOnce([{ userId: 'user-1', postId: 'post-1' }]);
        // delete where → ok
        mockTx.where.mockResolvedValueOnce(undefined);
        // update returning
        mockTx.returning.mockResolvedValueOnce([{ likeCount: 3 }]);
        return cb(mockTx);
      });

      const result = await toggleLike('post-1', 'post');
      expect(result).toEqual({ success: true, isLiked: false, likeCount: 3 });
    });
  });

  // ==================== Comment like/unlike ====================

  describe('comment 좋아요', () => {
    it('처음 좋아요 → insert + increment → isLiked: true', async () => {
      vi.doMock('@/lib/db', () => ({ db: mockDb }));
      vi.doMock('@/lib/auth/session', () => ({
        getSession: vi.fn().mockResolvedValue({ userId: 'user-1', email: 'a@b.com', nickname: 'test', role: 'user' }),
      }));
      const { toggleLike } = await import('@/components/shared/like-actions');

      mockDb.transaction.mockImplementation(async (cb: any) => {
        resetTx();
        mockTx.where.mockResolvedValueOnce([]);
        mockTx.values.mockResolvedValueOnce(undefined);
        mockTx.returning.mockResolvedValueOnce([{ likeCount: 10 }]);
        return cb(mockTx);
      });

      const result = await toggleLike('comment-1', 'comment');
      expect(result).toEqual({ success: true, isLiked: true, likeCount: 10 });
    });

    it('이미 좋아요 → delete + decrement → isLiked: false', async () => {
      vi.doMock('@/lib/db', () => ({ db: mockDb }));
      vi.doMock('@/lib/auth/session', () => ({
        getSession: vi.fn().mockResolvedValue({ userId: 'user-1', email: 'a@b.com', nickname: 'test', role: 'user' }),
      }));
      const { toggleLike } = await import('@/components/shared/like-actions');

      mockDb.transaction.mockImplementation(async (cb: any) => {
        resetTx();
        mockTx.where.mockResolvedValueOnce([{ userId: 'user-1', commentId: 'comment-1' }]);
        mockTx.where.mockResolvedValueOnce(undefined);
        mockTx.returning.mockResolvedValueOnce([{ likeCount: 8 }]);
        return cb(mockTx);
      });

      const result = await toggleLike('comment-1', 'comment');
      expect(result).toEqual({ success: true, isLiked: false, likeCount: 8 });
    });
  });

  // ==================== Hand like/unlike ====================

  describe('hand 좋아요', () => {
    it('처음 좋아요 → insert + increment → isLiked: true', async () => {
      vi.doMock('@/lib/db', () => ({ db: mockDb }));
      vi.doMock('@/lib/auth/session', () => ({
        getSession: vi.fn().mockResolvedValue({ userId: 'user-1', email: 'a@b.com', nickname: 'test', role: 'user' }),
      }));
      const { toggleLike } = await import('@/components/shared/like-actions');

      mockDb.transaction.mockImplementation(async (cb: any) => {
        resetTx();
        mockTx.where.mockResolvedValueOnce([]);
        mockTx.values.mockResolvedValueOnce(undefined);
        mockTx.returning.mockResolvedValueOnce([{ likeCount: 2 }]);
        return cb(mockTx);
      });

      const result = await toggleLike('hand-1', 'hand');
      expect(result).toEqual({ success: true, isLiked: true, likeCount: 2 });
    });

    it('이미 좋아요 → delete + decrement → isLiked: false', async () => {
      vi.doMock('@/lib/db', () => ({ db: mockDb }));
      vi.doMock('@/lib/auth/session', () => ({
        getSession: vi.fn().mockResolvedValue({ userId: 'user-1', email: 'a@b.com', nickname: 'test', role: 'user' }),
      }));
      const { toggleLike } = await import('@/components/shared/like-actions');

      mockDb.transaction.mockImplementation(async (cb: any) => {
        resetTx();
        mockTx.where.mockResolvedValueOnce([{ userId: 'user-1', handId: 'hand-1' }]);
        mockTx.where.mockResolvedValueOnce(undefined);
        mockTx.returning.mockResolvedValueOnce([{ likeCount: 0 }]);
        return cb(mockTx);
      });

      const result = await toggleLike('hand-1', 'hand');
      expect(result).toEqual({ success: true, isLiked: false, likeCount: 0 });
    });
  });

  // ==================== Thread like/unlike ====================

  describe('thread 좋아요 (likesCount 필드 사용)', () => {
    it('처음 좋아요 → insert + increment → isLiked: true', async () => {
      vi.doMock('@/lib/db', () => ({ db: mockDb }));
      vi.doMock('@/lib/auth/session', () => ({
        getSession: vi.fn().mockResolvedValue({ userId: 'user-1', email: 'a@b.com', nickname: 'test', role: 'user' }),
      }));
      const { toggleLike } = await import('@/components/shared/like-actions');

      mockDb.transaction.mockImplementation(async (cb: any) => {
        resetTx();
        mockTx.where.mockResolvedValueOnce([]);
        mockTx.values.mockResolvedValueOnce(undefined);
        // Thread uses likesCount (not likeCount)
        mockTx.returning.mockResolvedValueOnce([{ likesCount: 7 }]);
        return cb(mockTx);
      });

      const result = await toggleLike('thread-1', 'thread');
      expect(result).toEqual({ success: true, isLiked: true, likeCount: 7 });
    });

    it('이미 좋아요 → delete + decrement → isLiked: false', async () => {
      vi.doMock('@/lib/db', () => ({ db: mockDb }));
      vi.doMock('@/lib/auth/session', () => ({
        getSession: vi.fn().mockResolvedValue({ userId: 'user-1', email: 'a@b.com', nickname: 'test', role: 'user' }),
      }));
      const { toggleLike } = await import('@/components/shared/like-actions');

      mockDb.transaction.mockImplementation(async (cb: any) => {
        resetTx();
        mockTx.where.mockResolvedValueOnce([{ userId: 'user-1', threadId: 'thread-1' }]);
        mockTx.where.mockResolvedValueOnce(undefined);
        mockTx.returning.mockResolvedValueOnce([{ likesCount: 5 }]);
        return cb(mockTx);
      });

      const result = await toggleLike('thread-1', 'thread');
      expect(result).toEqual({ success: true, isLiked: false, likeCount: 5 });
    });
  });

  // ==================== Invalid target type ====================

  it('잘못된 target type → Invalid target type 에러', async () => {
    vi.doMock('@/lib/db', () => ({ db: mockDb }));
    vi.doMock('@/lib/auth/session', () => ({
      getSession: vi.fn().mockResolvedValue({ userId: 'user-1', email: 'a@b.com', nickname: 'test', role: 'user' }),
    }));
    const { toggleLike } = await import('@/components/shared/like-actions');

    mockDb.transaction.mockImplementation(async (cb: any) => {
      resetTx();
      return cb(mockTx);
    });

    const result = await toggleLike('id-1', 'invalid' as any);
    expect(result).toEqual({
      success: false,
      isLiked: false,
      likeCount: 0,
      error: 'Invalid target type',
    });
  });

  // ==================== Exception handling ====================

  it('트랜잭션 예외 → Failed to toggle like 에러', async () => {
    vi.doMock('@/lib/db', () => ({ db: mockDb }));
    vi.doMock('@/lib/auth/session', () => ({
      getSession: vi.fn().mockResolvedValue({ userId: 'user-1', email: 'a@b.com', nickname: 'test', role: 'user' }),
    }));
    const { toggleLike } = await import('@/components/shared/like-actions');

    mockDb.transaction.mockRejectedValueOnce(new Error('DB connection lost'));

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = await toggleLike('post-1', 'post');

    expect(result).toEqual({
      success: false,
      isLiked: false,
      likeCount: 0,
      error: 'Failed to toggle like',
    });
    expect(consoleSpy).toHaveBeenCalledWith('toggleLike error:', expect.any(Error));
    consoleSpy.mockRestore();
  });
});

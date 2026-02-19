import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Mocks ---

const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
};

vi.mock('@/lib/db', () => ({ db: mockDb }));

const mockGetSession = vi.fn();
vi.mock('@/lib/auth/session', () => ({ getSession: mockGetSession }));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((...args: any[]) => ({ type: 'eq', args })),
  and: vi.fn((...args: any[]) => ({ type: 'and', args })),
}));

vi.mock('@/lib/db/schema', () => ({
  newsBookmarks: {
    userId: 'newsBookmarks.userId',
    newsId: 'newsBookmarks.newsId',
    title: 'newsBookmarks.title',
    link: 'newsBookmarks.link',
    source: 'newsBookmarks.source',
    createdAt: 'newsBookmarks.createdAt',
  },
}));

function resetDbMocks() {
  for (const key of Object.keys(mockDb) as (keyof typeof mockDb)[]) {
    mockDb[key].mockReset();
    mockDb[key].mockReturnThis();
  }
}

const userSession = { userId: 'user-1', email: 'user@test.com', nickname: 'User', role: 'user' };

describe('News Bookmark Actions', () => {
  beforeEach(() => {
    vi.resetModules();
    resetDbMocks();
    mockGetSession.mockReset();
  });

  // ==================== toggleNewsBookmark ====================

  describe('toggleNewsBookmark', () => {
    it('세션 없으면 { error: 로그인이 필요합니다 } 반환', async () => {
      mockGetSession.mockResolvedValue(null);
      const { toggleNewsBookmark } = await import('@/app/(boards)/news/actions');

      const result = await toggleNewsBookmark('news-1', '제목', 'https://link.com', 'source');

      expect(result).toEqual({ error: '로그인이 필요합니다' });
    });

    it('기존 북마크 없으면 insert → { bookmarked: true } 반환', async () => {
      mockGetSession.mockResolvedValue(userSession);
      const { toggleNewsBookmark } = await import('@/app/(boards)/news/actions');

      // select().from().where().limit() → no existing bookmark
      mockDb.limit.mockResolvedValueOnce([]);
      // insert().values() terminal
      mockDb.values.mockResolvedValueOnce(undefined);

      const result = await toggleNewsBookmark('news-1', '포커 뉴스', 'https://news.com', 'naver');

      expect(result).toEqual({ bookmarked: true });
      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.values).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          newsId: 'news-1',
          title: '포커 뉴스',
          link: 'https://news.com',
          source: 'naver',
        })
      );
    });

    it('기존 북마크 있으면 delete → { bookmarked: false } 반환', async () => {
      mockGetSession.mockResolvedValue(userSession);
      const { toggleNewsBookmark } = await import('@/app/(boards)/news/actions');

      // select().from().where().limit() chain:
      // where() is mid-chain → returns this; limit() resolves with existing bookmark
      mockDb.where.mockReturnValueOnce(mockDb); // first .where() mid-chain for select
      mockDb.limit.mockResolvedValueOnce([
        { userId: 'user-1', newsId: 'news-1', title: '포커 뉴스', link: 'https://news.com', source: 'naver' },
      ]);
      // delete().where() terminal
      mockDb.where.mockResolvedValueOnce(undefined);

      const result = await toggleNewsBookmark('news-1', '포커 뉴스', 'https://news.com', 'naver');

      expect(result).toEqual({ bookmarked: false });
      expect(mockDb.delete).toHaveBeenCalled();
      expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it('DB 에러 발생 시 { error: 북마크 처리 중 오류가 발생했습니다 } 반환', async () => {
      mockGetSession.mockResolvedValue(userSession);
      const { toggleNewsBookmark } = await import('@/app/(boards)/news/actions');

      mockDb.limit.mockRejectedValueOnce(new Error('DB connection failed'));

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const result = await toggleNewsBookmark('news-1', '제목', 'https://link.com', 'source');

      expect(result).toEqual({ error: '북마크 처리 중 오류가 발생했습니다' });
      consoleSpy.mockRestore();
    });
  });

  // ==================== getBookmarkedNews ====================

  describe('getBookmarkedNews', () => {
    it('세션 없으면 { error: 로그인이 필요합니다 } 반환', async () => {
      mockGetSession.mockResolvedValue(null);
      const { getBookmarkedNews } = await import('@/app/(boards)/news/actions');

      const result = await getBookmarkedNews();

      expect(result).toEqual({ error: '로그인이 필요합니다' });
    });

    it('북마크 목록을 BookmarkedNewsItem 배열로 반환', async () => {
      mockGetSession.mockResolvedValue(userSession);
      const { getBookmarkedNews } = await import('@/app/(boards)/news/actions');

      const createdAt = new Date('2026-02-18T10:00:00Z');
      const dbRows = [
        {
          userId: 'user-1',
          newsId: 'news-1',
          title: '포커 뉴스 1',
          link: 'https://news1.com',
          source: 'naver',
          createdAt,
        },
        {
          userId: 'user-1',
          newsId: 'news-2',
          title: '포커 뉴스 2',
          link: 'https://news2.com',
          source: 'daum',
          createdAt,
        },
      ];

      // select().from().where().orderBy() terminal
      mockDb.orderBy.mockResolvedValueOnce(dbRows);

      const result = await getBookmarkedNews();

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
      expect((result as any[])[0]).toEqual({
        newsId: 'news-1',
        title: '포커 뉴스 1',
        link: 'https://news1.com',
        source: 'naver',
        createdAt,
      });
    });

    it('북마크 없으면 빈 배열 반환', async () => {
      mockGetSession.mockResolvedValue(userSession);
      const { getBookmarkedNews } = await import('@/app/(boards)/news/actions');

      mockDb.orderBy.mockResolvedValueOnce([]);

      const result = await getBookmarkedNews();

      expect(result).toEqual([]);
    });

    it('DB 에러 발생 시 error 객체 반환', async () => {
      mockGetSession.mockResolvedValue(userSession);
      const { getBookmarkedNews } = await import('@/app/(boards)/news/actions');

      mockDb.orderBy.mockRejectedValueOnce(new Error('DB error'));

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const result = await getBookmarkedNews();

      expect(result).toEqual({ error: '북마크 목록을 불러오는 중 오류가 발생했습니다' });
      consoleSpy.mockRestore();
    });
  });

  // ==================== getUserNewsBookmarkIds ====================

  describe('getUserNewsBookmarkIds', () => {
    it('세션 없으면 빈 배열 반환 (throw 아님)', async () => {
      mockGetSession.mockResolvedValue(null);
      const { getUserNewsBookmarkIds } = await import('@/app/(boards)/news/actions');

      const result = await getUserNewsBookmarkIds();

      expect(result).toEqual([]);
    });

    it('세션 있으면 newsId 배열 반환', async () => {
      mockGetSession.mockResolvedValue(userSession);
      const { getUserNewsBookmarkIds } = await import('@/app/(boards)/news/actions');

      // select({ newsId }).from().where() terminal
      mockDb.where.mockResolvedValueOnce([
        { newsId: 'news-1' },
        { newsId: 'news-2' },
        { newsId: 'news-3' },
      ]);

      const result = await getUserNewsBookmarkIds();

      expect(result).toEqual(['news-1', 'news-2', 'news-3']);
    });

    it('북마크 없으면 빈 배열 반환', async () => {
      mockGetSession.mockResolvedValue(userSession);
      const { getUserNewsBookmarkIds } = await import('@/app/(boards)/news/actions');

      mockDb.where.mockResolvedValueOnce([]);

      const result = await getUserNewsBookmarkIds();

      expect(result).toEqual([]);
    });

    it('DB 에러 발생 시 빈 배열 반환', async () => {
      mockGetSession.mockResolvedValue(userSession);
      const { getUserNewsBookmarkIds } = await import('@/app/(boards)/news/actions');

      mockDb.where.mockRejectedValueOnce(new Error('DB error'));

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const result = await getUserNewsBookmarkIds();

      expect(result).toEqual([]);
      consoleSpy.mockRestore();
    });
  });
});

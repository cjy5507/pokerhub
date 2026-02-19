import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Mocks ---

const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  innerJoin: vi.fn().mockReturnThis(),
};

vi.mock('@/lib/db', () => ({ db: mockDb }));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((...args: any[]) => ({ type: 'eq', args })),
  and: vi.fn((...args: any[]) => ({ type: 'and', args })),
  or: vi.fn((...args: any[]) => ({ type: 'or', args })),
  ilike: vi.fn((...args: any[]) => ({ type: 'ilike', args })),
  desc: vi.fn((col: any) => ({ type: 'desc', col })),
}));

vi.mock('@/lib/db/schema', () => ({
  posts: {
    id: 'posts.id',
    title: 'posts.title',
    content: 'posts.content',
    status: 'posts.status',
    createdAt: 'posts.createdAt',
    authorId: 'posts.authorId',
    boardId: 'posts.boardId',
  },
  boards: {
    id: 'boards.id',
    nameKo: 'boards.nameKo',
    slug: 'boards.slug',
  },
  users: {
    id: 'users.id',
    nickname: 'users.nickname',
  },
}));

function resetDbMocks() {
  for (const key of Object.keys(mockDb) as (keyof typeof mockDb)[]) {
    mockDb[key].mockReset();
    mockDb[key].mockReturnThis();
  }
}

describe('searchPosts', () => {
  beforeEach(() => {
    vi.resetModules();
    resetDbMocks();
  });

  it('빈 쿼리 → 빈 배열 반환 (DB 조회 없음)', async () => {
    const { searchPosts } = await import('@/app/search/actions');

    const result = await searchPosts('');

    expect(result).toEqual([]);
    expect(mockDb.select).not.toHaveBeenCalled();
  });

  it('공백만 있는 쿼리 → 빈 배열 반환', async () => {
    const { searchPosts } = await import('@/app/search/actions');

    const result = await searchPosts('   ');

    expect(result).toEqual([]);
    expect(mockDb.select).not.toHaveBeenCalled();
  });

  it('db가 null이면 빈 배열 반환', async () => {
    vi.doMock('@/lib/db', () => ({ db: null }));
    vi.resetModules();

    const { searchPosts } = await import('@/app/search/actions');
    const result = await searchPosts('포커');

    expect(result).toEqual([]);

    vi.doMock('@/lib/db', () => ({ db: mockDb }));
  });

  it('검색 결과를 SearchResult 형태로 매핑하여 반환', async () => {
    const { searchPosts } = await import('@/app/search/actions');

    const createdAt = new Date('2026-02-18T00:00:00Z');
    const dbRows = [
      {
        id: 'post-1',
        title: '포커 전략 공유',
        content: '블러핑에 대한 상세한 분석입니다. 이 글은 매우 긴 내용을 담고 있습니다.',
        createdAt,
        authorNickname: 'Alice',
        boardName: '전략게시판',
        boardSlug: 'strategy',
      },
    ];

    // chain: select().from().innerJoin().innerJoin().where().orderBy().limit()
    mockDb.limit.mockResolvedValueOnce(dbRows);

    const result = await searchPosts('포커');

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: 'post-1',
      title: '포커 전략 공유',
      author: 'Alice',
      board: '전략게시판',
      boardSlug: 'strategy',
      date: '2026-02-18',
      content: '블러핑에 대한 상세한 분석입니다. 이 글은 매우 긴 내용을 담고 있습니다.',
    });
  });

  it('content가 200자 초과 시 200자로 잘라냄', async () => {
    const { searchPosts } = await import('@/app/search/actions');

    const longContent = 'A'.repeat(300);
    const dbRows = [
      {
        id: 'post-2',
        title: '긴 글',
        content: longContent,
        createdAt: new Date('2026-02-18T00:00:00Z'),
        authorNickname: 'Bob',
        boardName: '자유게시판',
        boardSlug: 'free',
      },
    ];

    mockDb.limit.mockResolvedValueOnce(dbRows);

    const result = await searchPosts('긴 글');

    expect(result[0].content).toHaveLength(200);
    expect(result[0].content).toBe('A'.repeat(200));
  });

  it('content가 null이면 undefined로 반환', async () => {
    const { searchPosts } = await import('@/app/search/actions');

    const dbRows = [
      {
        id: 'post-3',
        title: '내용 없는 글',
        content: null,
        createdAt: new Date('2026-02-18T00:00:00Z'),
        authorNickname: 'Carol',
        boardName: '자유게시판',
        boardSlug: 'free',
      },
    ];

    mockDb.limit.mockResolvedValueOnce(dbRows);

    const result = await searchPosts('내용');

    expect(result[0].content).toBeUndefined();
  });

  it('limit 20 적용 확인', async () => {
    const { searchPosts } = await import('@/app/search/actions');

    mockDb.limit.mockResolvedValueOnce([]);

    await searchPosts('test');

    expect(mockDb.limit).toHaveBeenCalledWith(20);
  });

  it('innerJoin으로 users와 boards 포함', async () => {
    const { searchPosts } = await import('@/app/search/actions');

    mockDb.limit.mockResolvedValueOnce([]);

    await searchPosts('query');

    // innerJoin called twice: once for users, once for boards
    expect(mockDb.innerJoin).toHaveBeenCalledTimes(2);
  });

  it('여러 검색 결과를 모두 반환', async () => {
    const { searchPosts } = await import('@/app/search/actions');

    const dbRows = Array.from({ length: 5 }, (_, i) => ({
      id: `post-${i}`,
      title: `포커 글 ${i}`,
      content: `내용 ${i}`,
      createdAt: new Date('2026-02-18T00:00:00Z'),
      authorNickname: `User${i}`,
      boardName: '자유게시판',
      boardSlug: 'free',
    }));

    mockDb.limit.mockResolvedValueOnce(dbRows);

    const result = await searchPosts('포커');

    expect(result).toHaveLength(5);
    result.forEach((r, i) => {
      expect(r.id).toBe(`post-${i}`);
      expect(r.title).toBe(`포커 글 ${i}`);
    });
  });
});

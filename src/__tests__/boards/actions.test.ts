import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createMockDb,
  mockUserSession,
  mockAdminSession,
  createTestBoard,
  createTestPost,
  createTestComment,
  createTestUser,
  createTestUUID,
  resetMocks,
} from '../helpers/mocks';

// ==================== MODULE MOCKS ====================

// We capture the mockDb reference so tests can reconfigure it per-test
let mockDb = createMockDb();

vi.mock('@/lib/db', () => ({
  get db() {
    return mockDb;
  },
}));

vi.mock('@/lib/auth/session', () => ({
  getSession: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/queries/boards', () => ({
  isPostOwner: vi.fn(),
  isCommentOwner: vi.fn(),
}));

vi.mock('isomorphic-dompurify', () => ({
  default: { sanitize: vi.fn((html: string) => html) },
}));

// ==================== IMPORTS (after mocks) ====================

import {
  createPost,
  updatePost,
  deletePost,
  togglePostLike,
  toggleBookmark,
  createComment,
  updateComment,
  deleteComment,
  toggleCommentLike,
  reportPost,
  incrementViewCount,
} from '@/app/(boards)/actions';
import { getSession } from '@/lib/auth/session';
import { isPostOwner, isCommentOwner } from '@/lib/queries/boards';

// ==================== HELPERS ====================

function mockSession(session: any | null) {
  vi.mocked(getSession).mockResolvedValue(session as any);
}

/**
 * Sets up db.query.X.findFirst to resolve to `result`.
 * Drizzle's `db.query.*` are methods on the query object.
 */
function mockQueryFindFirst(table: string, result: any) {
  if (!mockDb.query[table]) {
    mockDb.query[table] = {};
  }
  mockDb.query[table].findFirst = vi.fn().mockResolvedValue(result);
}

/**
 * Create a chainable drizzle mock that resolves to `result` when awaited.
 * Supports: .insert().values().returning(), .update().set().where(),
 * .delete().where(), .select().from().where() etc.
 */
function createChain(result: any = []) {
  const methods = [
    'select', 'from', 'where', 'orderBy', 'limit', 'offset',
    'insert', 'values', 'returning', 'onConflictDoUpdate', 'onConflictDoNothing',
    'update', 'set', 'delete',
    'innerJoin', 'leftJoin', 'rightJoin',
    'groupBy', 'having',
  ];

  const chain: any = {};
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }

  // Make the chain awaitable by implementing the Promise thenable protocol
  chain.then = (onFulfilled: any, onRejected: any) =>
    Promise.resolve(result).then(onFulfilled, onRejected);
  chain.catch = (onRejected: any) => Promise.resolve(result).catch(onRejected);
  chain.finally = (onFinally: any) => Promise.resolve(result).finally(onFinally);

  return chain;
}

// ==================== SETUP ====================

beforeEach(() => {
  resetMocks();
  // Reset mockDb to a fresh instance
  mockDb = createMockDb();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ==================== createPost ====================

describe('createPost', () => {
  const validInput = {
    boardId: createTestUUID(),
    title: '테스트 게시글 제목',
    content: '테스트 게시글 내용입니다.',
    contentHtml: '<p>테스트 게시글 내용입니다.</p>',
  };

  it('returns error when not authenticated', async () => {
    mockSession(null);

    const result = await createPost(validInput);

    expect(result.success).toBe(false);
    expect(result.error).toContain('로그인이 필요합니다');
  });

  it('returns error when db is null', async () => {
    // Temporarily nullify mockDb to simulate DB unavailable
    const savedDb = mockDb;
    mockDb = null as any;

    const result = await createPost(validInput);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Database not available');

    mockDb = savedDb;
  });

  it('returns error when board not found', async () => {
    mockSession(mockUserSession);
    mockQueryFindFirst('boards', undefined);

    const result = await createPost(validInput);

    expect(result.success).toBe(false);
    expect(result.error).toBe('게시판을 찾을 수 없습니다');
  });

  it('returns error when board is inactive', async () => {
    mockSession(mockUserSession);
    mockQueryFindFirst('boards', createTestBoard({ isActive: false }));

    const result = await createPost(validInput);

    expect(result.success).toBe(false);
    expect(result.error).toBe('게시판을 찾을 수 없습니다');
  });

  it('returns error when user level is too low', async () => {
    mockSession(mockUserSession);
    mockQueryFindFirst('boards', createTestBoard({ minLevelToPost: 5 }));
    mockQueryFindFirst('users', createTestUser({ level: 1 }));

    const result = await createPost(validInput);

    expect(result.success).toBe(false);
    expect(result.error).toContain('레벨 5');
  });

  it('returns error when board is notice and user is not admin', async () => {
    mockSession(mockUserSession); // role: 'user'
    mockQueryFindFirst('boards', createTestBoard({ slug: 'notice', minLevelToPost: 0 }));

    const result = await createPost(validInput);

    expect(result.success).toBe(false);
    expect(result.error).toBe('공지사항은 관리자만 작성할 수 있습니다');
  });

  it('successfully creates post and returns postId', async () => {
    const postId = createTestUUID();
    mockSession(mockUserSession);

    const board = createTestBoard({ id: validInput.boardId, minLevelToPost: 0 });
    mockQueryFindFirst('boards', board);
    mockQueryFindFirst('users', createTestUser({ level: 5 }));

    // db.query.users for awardPoints
    mockDb.query.users = {
      findFirst: vi.fn().mockResolvedValue(createTestUser({ points: 1000 })),
    };

    // insert post returning [{ id: postId }]
    const insertChain = createChain([{ id: postId }]);
    mockDb.insert = vi.fn().mockReturnValue(insertChain);

    // update for board post count, user xp, user points
    const updateChain = createChain([]);
    mockDb.update = vi.fn().mockReturnValue(updateChain);

    const result = await createPost(validInput);

    expect(result.success).toBe(true);
    expect((result as any).postId).toBe(postId);
  });

  it('validates input with Zod schema — returns error for invalid title (empty string)', async () => {
    mockSession(mockUserSession);

    const result = await createPost({
      boardId: createTestUUID(),
      title: '',
      content: '내용',
    });

    expect(result.success).toBe(false);
    // ZodError message bubbles up as error.message
    expect(result.error).toBeDefined();
  });

  it('validates input with Zod schema — returns error for invalid boardId (not UUID)', async () => {
    mockSession(mockUserSession);

    const result = await createPost({
      boardId: 'not-a-uuid',
      title: '제목',
      content: '내용',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('allows admin to post to notice board', async () => {
    const postId = createTestUUID();
    mockSession(mockAdminSession);

    const board = createTestBoard({ slug: 'notice', minLevelToPost: 0 });
    mockQueryFindFirst('boards', board);
    mockQueryFindFirst('users', createTestUser({ id: mockAdminSession.userId, level: 10 }));

    // db.query.users for awardPoints inside awardPoints helper
    mockDb.query.users = {
      findFirst: vi.fn().mockResolvedValue(createTestUser({ id: mockAdminSession.userId, points: 5000 })),
    };

    const insertChain = createChain([{ id: postId }]);
    mockDb.insert = vi.fn().mockReturnValue(insertChain);
    mockDb.update = vi.fn().mockReturnValue(createChain([]));

    const result = await createPost(validInput);

    expect(result.success).toBe(true);
    expect((result as any).postId).toBe(postId);
  });
});

// ==================== updatePost ====================

describe('updatePost', () => {
  const validInput = {
    postId: createTestUUID(),
    title: '수정된 제목',
    content: '수정된 내용',
  };

  it('returns error when not authenticated', async () => {
    mockSession(null);

    const result = await updatePost(validInput);

    expect(result.success).toBe(false);
    expect(result.error).toContain('로그인이 필요합니다');
  });

  it('returns error when not post owner', async () => {
    mockSession(mockUserSession);
    vi.mocked(isPostOwner).mockResolvedValue(false);

    const result = await updatePost(validInput);

    expect(result.success).toBe(false);
    expect(result.error).toBe('게시글을 수정할 권한이 없습니다');
  });

  it('successfully updates post', async () => {
    mockSession(mockUserSession);
    vi.mocked(isPostOwner).mockResolvedValue(true);

    mockDb.update = vi.fn().mockReturnValue(createChain([]));

    // db.query.posts.findFirst for getting board slug after update
    const board = createTestBoard();
    mockDb.query.posts = {
      findFirst: vi.fn().mockResolvedValue({ board: { slug: board.slug } }),
    };

    const result = await updatePost(validInput);

    expect(result.success).toBe(true);
  });
});

// ==================== deletePost ====================

describe('deletePost', () => {
  const validInput = { postId: createTestUUID() };

  it('returns error when not authenticated', async () => {
    mockSession(null);

    const result = await deletePost(validInput);

    expect(result.success).toBe(false);
    expect(result.error).toContain('로그인이 필요합니다');
  });

  it('returns error when not post owner', async () => {
    mockSession(mockUserSession);
    vi.mocked(isPostOwner).mockResolvedValue(false);

    const result = await deletePost(validInput);

    expect(result.success).toBe(false);
    expect(result.error).toBe('게시글을 삭제할 권한이 없습니다');
  });

  it('returns error when post not found after ownership check passes', async () => {
    mockSession(mockUserSession);
    vi.mocked(isPostOwner).mockResolvedValue(true);

    // db.query.posts.findFirst returns undefined (post not found)
    mockDb.query.posts = {
      findFirst: vi.fn().mockResolvedValue(undefined),
    };

    const result = await deletePost(validInput);

    expect(result.success).toBe(false);
    expect(result.error).toBe('게시글을 찾을 수 없습니다');
  });

  it('successfully soft-deletes post and decrements board post count', async () => {
    mockSession(mockUserSession);
    vi.mocked(isPostOwner).mockResolvedValue(true);

    const board = createTestBoard();
    mockDb.query.posts = {
      findFirst: vi.fn().mockResolvedValue({
        ...createTestPost(),
        board: { slug: board.slug, id: board.id },
      }),
    };

    mockDb.update = vi.fn().mockReturnValue(createChain([]));

    const result = await deletePost(validInput);

    expect(result.success).toBe(true);
    // update should be called twice: soft-delete + board postCount decrement
    expect(mockDb.update).toHaveBeenCalledTimes(2);
  });
});

// ==================== togglePostLike ====================

describe('togglePostLike', () => {
  const validInput = { postId: createTestUUID() };

  it('returns error when not authenticated', async () => {
    mockSession(null);

    const result = await togglePostLike(validInput);

    expect(result.success).toBe(false);
    expect(result.error).toContain('로그인이 필요합니다');
  });

  it('successfully likes a post when no existing like', async () => {
    mockSession(mockUserSession);

    // Build the tx mock for the main togglePostLike transaction
    const txInsert = vi.fn().mockReturnValue(createChain([]));
    const txUpdate = vi.fn().mockReturnValue(createChain([]));
    // tx.delete(...).where(...).returning() returns [] — no existing like
    const txDelete = vi.fn().mockReturnValue(createChain([]));
    const tx: any = {
      delete: txDelete,
      insert: txInsert,
      update: txUpdate,
      query: {
        posts: {
          // Returns a different author so points will be awarded
          findFirst: vi.fn().mockResolvedValue({ authorId: 'another-user-id' }),
        },
      },
    };

    // Build the tx mock for the awardPoints transaction (called after the main tx)
    const awardTxUpdate = vi.fn().mockReturnValue(createChain([{ points: 105 }]));
    const awardTxInsert = vi.fn().mockReturnValue(createChain([]));
    const awardTx: any = {
      update: awardTxUpdate,
      insert: awardTxInsert,
    };

    let transactionCallCount = 0;
    mockDb.transaction = vi.fn().mockImplementation(async (fn: any) => {
      transactionCallCount++;
      if (transactionCallCount === 1) {
        return fn(tx);
      }
      // Second call is awardPoints transaction
      return fn(awardTx);
    });

    const result = await togglePostLike(validInput);

    expect(result.success).toBe(true);
    expect((result as any).liked).toBe(true);
    expect(txInsert).toHaveBeenCalled();
  });

  it('successfully unlikes a post when existing like found', async () => {
    mockSession(mockUserSession);

    // tx.delete(...).returning() returns a row — existing like found
    const txDelete = vi.fn().mockReturnValue(createChain([{ userId: mockUserSession.userId }]));
    const txUpdate = vi.fn().mockReturnValue(createChain([]));
    const tx: any = {
      delete: txDelete,
      update: txUpdate,
    };

    mockDb.transaction = vi.fn().mockImplementation(async (fn: any) => fn(tx));

    const result = await togglePostLike(validInput);

    expect(result.success).toBe(true);
    expect((result as any).liked).toBe(false);
    expect(txDelete).toHaveBeenCalled();
  });

  it('does not award points when liker is the post author', async () => {
    mockSession(mockUserSession);

    // tx.delete(...).returning() returns [] — no existing like (liking for the first time)
    const txInsert = vi.fn().mockReturnValue(createChain([]));
    const txUpdate = vi.fn().mockReturnValue(createChain([]));
    const txDelete = vi.fn().mockReturnValue(createChain([]));
    const tx: any = {
      delete: txDelete,
      insert: txInsert,
      update: txUpdate,
      query: {
        posts: {
          // post.authorId === session.userId — same user, no points awarded
          findFirst: vi.fn().mockResolvedValue({ authorId: mockUserSession.userId }),
        },
      },
    };

    mockDb.transaction = vi.fn().mockImplementation(async (fn: any) => fn(tx));

    const result = await togglePostLike(validInput);

    expect(result.success).toBe(true);
    expect((result as any).liked).toBe(true);
    // awardPoints is NOT called when authorId === userId, so db.transaction
    // is only called once (the main togglePostLike transaction)
    expect(mockDb.transaction).toHaveBeenCalledTimes(1);
  });
});

// ==================== toggleBookmark ====================

describe('toggleBookmark', () => {
  const validInput = { postId: createTestUUID() };

  it('returns error when not authenticated', async () => {
    mockSession(null);

    const result = await toggleBookmark(validInput);

    expect(result.success).toBe(false);
    expect(result.error).toContain('로그인이 필요합니다');
  });

  it('successfully adds bookmark when none exists', async () => {
    mockSession(mockUserSession);

    // tx.delete(...).returning() returns [] — no existing bookmark
    const txDelete = vi.fn().mockReturnValue(createChain([]));
    const txInsert = vi.fn().mockReturnValue(createChain([]));
    const txUpdate = vi.fn().mockReturnValue(createChain([]));
    const tx: any = {
      delete: txDelete,
      insert: txInsert,
      update: txUpdate,
    };

    mockDb.transaction = vi.fn().mockImplementation(async (fn: any) => fn(tx));

    const result = await toggleBookmark(validInput);

    expect(result.success).toBe(true);
    expect((result as any).bookmarked).toBe(true);
    expect(txInsert).toHaveBeenCalled();
  });

  it('successfully removes bookmark when existing bookmark found', async () => {
    mockSession(mockUserSession);

    // tx.delete(...).returning() returns a row — existing bookmark found
    const txDelete = vi.fn().mockReturnValue(createChain([{ userId: mockUserSession.userId }]));
    const txUpdate = vi.fn().mockReturnValue(createChain([]));
    const tx: any = {
      delete: txDelete,
      update: txUpdate,
    };

    mockDb.transaction = vi.fn().mockImplementation(async (fn: any) => fn(tx));

    const result = await toggleBookmark(validInput);

    expect(result.success).toBe(true);
    expect((result as any).bookmarked).toBe(false);
    expect(txDelete).toHaveBeenCalled();
  });
});

// ==================== createComment ====================

describe('createComment', () => {
  const validInput = {
    postId: createTestUUID(),
    content: '테스트 댓글입니다.',
  };

  it('returns error when not authenticated', async () => {
    mockSession(null);

    const result = await createComment(validInput);

    expect(result.success).toBe(false);
    expect(result.error).toContain('로그인이 필요합니다');
  });

  it('returns error when post not found', async () => {
    mockSession(mockUserSession);

    mockQueryFindFirst('posts', undefined);

    const result = await createComment(validInput);

    expect(result.success).toBe(false);
    expect(result.error).toBe('게시글을 찾을 수 없습니다');
  });

  it('successfully creates comment and returns commentId', async () => {
    const commentId = createTestUUID();
    mockSession(mockUserSession);

    mockQueryFindFirst('posts', createTestPost({ id: validInput.postId }));

    // db.query.users for awardPoints
    mockDb.query.users = {
      findFirst: vi.fn().mockResolvedValue(createTestUser({ points: 100 })),
    };

    // insert comment returning [{ id: commentId }]
    const insertChain = createChain([{ id: commentId }]);
    mockDb.insert = vi.fn().mockReturnValue(insertChain);
    mockDb.update = vi.fn().mockReturnValue(createChain([]));

    const result = await createComment(validInput);

    expect(result.success).toBe(true);
    expect((result as any).commentId).toBe(commentId);
  });

  it('creates comment with parentId for nested replies', async () => {
    const commentId = createTestUUID();
    const parentId = createTestUUID();
    mockSession(mockUserSession);

    mockQueryFindFirst('posts', createTestPost({ id: validInput.postId }));

    mockDb.query.users = {
      findFirst: vi.fn().mockResolvedValue(createTestUser({ points: 100 })),
    };

    const insertChain = createChain([{ id: commentId }]);
    mockDb.insert = vi.fn().mockReturnValue(insertChain);
    mockDb.update = vi.fn().mockReturnValue(createChain([]));

    const result = await createComment({ ...validInput, parentId });

    expect(result.success).toBe(true);
  });
});

// ==================== updateComment ====================

describe('updateComment', () => {
  const validInput = {
    commentId: createTestUUID(),
    content: '수정된 댓글 내용',
  };

  it('returns error when not authenticated', async () => {
    mockSession(null);

    const result = await updateComment(validInput);

    expect(result.success).toBe(false);
    expect(result.error).toContain('로그인이 필요합니다');
  });

  it('returns error when content is empty string', async () => {
    mockSession(mockUserSession);

    const result = await updateComment({ ...validInput, content: '' });

    expect(result.success).toBe(false);
    expect(result.error).toBe('댓글 내용을 입력해주세요');
  });

  it('returns error when content is only whitespace', async () => {
    mockSession(mockUserSession);

    const result = await updateComment({ ...validInput, content: '   ' });

    expect(result.success).toBe(false);
    expect(result.error).toBe('댓글 내용을 입력해주세요');
  });

  it('returns error when not comment owner', async () => {
    mockSession(mockUserSession);
    vi.mocked(isCommentOwner).mockResolvedValue(false);

    const result = await updateComment(validInput);

    expect(result.success).toBe(false);
    expect(result.error).toBe('댓글을 수정할 권한이 없습니다');
  });

  it('successfully updates comment', async () => {
    mockSession(mockUserSession);
    vi.mocked(isCommentOwner).mockResolvedValue(true);

    mockDb.update = vi.fn().mockReturnValue(createChain([]));

    const result = await updateComment(validInput);

    expect(result.success).toBe(true);
    expect(mockDb.update).toHaveBeenCalled();
  });
});

// ==================== deleteComment ====================

describe('deleteComment', () => {
  const validInput = { commentId: createTestUUID() };

  it('returns error when not authenticated', async () => {
    mockSession(null);

    const result = await deleteComment(validInput);

    expect(result.success).toBe(false);
    expect(result.error).toContain('로그인이 필요합니다');
  });

  it('returns error when not comment owner', async () => {
    mockSession(mockUserSession);
    vi.mocked(isCommentOwner).mockResolvedValue(false);

    const result = await deleteComment(validInput);

    expect(result.success).toBe(false);
    expect(result.error).toBe('댓글을 삭제할 권한이 없습니다');
  });

  it('returns error when comment not found after ownership check passes', async () => {
    mockSession(mockUserSession);
    vi.mocked(isCommentOwner).mockResolvedValue(true);

    mockDb.query.comments = {
      findFirst: vi.fn().mockResolvedValue(undefined),
    };

    const result = await deleteComment(validInput);

    expect(result.success).toBe(false);
    expect(result.error).toBe('댓글을 찾을 수 없습니다');
  });

  it('successfully soft-deletes comment and decrements post comment count', async () => {
    const postId = createTestUUID();
    mockSession(mockUserSession);
    vi.mocked(isCommentOwner).mockResolvedValue(true);

    mockDb.query.comments = {
      findFirst: vi.fn().mockResolvedValue(createTestComment({ postId })),
    };

    mockDb.update = vi.fn().mockReturnValue(createChain([]));

    const result = await deleteComment(validInput);

    expect(result.success).toBe(true);
    // update called twice: soft-delete comment + decrement post.commentCount
    expect(mockDb.update).toHaveBeenCalledTimes(2);
  });
});

// ==================== toggleCommentLike ====================

describe('toggleCommentLike', () => {
  const validInput = { commentId: createTestUUID() };

  it('returns error when not authenticated', async () => {
    mockSession(null);

    const result = await toggleCommentLike(validInput);

    expect(result.success).toBe(false);
    expect(result.error).toContain('로그인이 필요합니다');
  });

  it('successfully likes comment when no existing like', async () => {
    mockSession(mockUserSession);

    // tx.delete(...).returning() returns [] — no existing like
    const txDelete = vi.fn().mockReturnValue(createChain([]));
    const txInsert = vi.fn().mockReturnValue(createChain([]));
    const txUpdate = vi.fn().mockReturnValue(createChain([]));
    const tx: any = {
      delete: txDelete,
      insert: txInsert,
      update: txUpdate,
    };

    mockDb.transaction = vi.fn().mockImplementation(async (fn: any) => fn(tx));

    const result = await toggleCommentLike(validInput);

    expect(result.success).toBe(true);
    expect((result as any).liked).toBe(true);
    expect(txInsert).toHaveBeenCalled();
  });

  it('successfully unlikes comment when existing like found', async () => {
    mockSession(mockUserSession);

    // tx.delete(...).returning() returns a row — existing like found
    const txDelete = vi.fn().mockReturnValue(createChain([{ userId: mockUserSession.userId }]));
    const txUpdate = vi.fn().mockReturnValue(createChain([]));
    const tx: any = {
      delete: txDelete,
      update: txUpdate,
    };

    mockDb.transaction = vi.fn().mockImplementation(async (fn: any) => fn(tx));

    const result = await toggleCommentLike(validInput);

    expect(result.success).toBe(true);
    expect((result as any).liked).toBe(false);
    expect(txDelete).toHaveBeenCalled();
  });
});

// ==================== reportPost ====================

describe('reportPost', () => {
  const validInput = {
    postId: createTestUUID(),
    reason: '스팸 게시글입니다. 삭제 요청드립니다.',
  };

  it('returns error when not authenticated', async () => {
    mockSession(null);

    const result = await reportPost(validInput);

    expect(result.success).toBe(false);
    expect(result.error).toContain('로그인이 필요합니다');
  });

  it('returns error when post not found', async () => {
    mockSession(mockUserSession);

    mockQueryFindFirst('posts', undefined);

    const result = await reportPost(validInput);

    expect(result.success).toBe(false);
    expect(result.error).toBe('게시글을 찾을 수 없습니다');
  });

  it('returns error when reason is too short (Zod validation)', async () => {
    mockSession(mockUserSession);

    const result = await reportPost({
      postId: createTestUUID(),
      reason: '짧음', // fewer than 10 chars
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('successfully creates report', async () => {
    mockSession(mockUserSession);

    mockQueryFindFirst('posts', createTestPost({ id: validInput.postId }));

    mockDb.insert = vi.fn().mockReturnValue(createChain([]));

    const result = await reportPost(validInput);

    expect(result.success).toBe(true);
    expect(mockDb.insert).toHaveBeenCalled();
  });
});

// ==================== incrementViewCount ====================

describe('incrementViewCount', () => {
  it('successfully increments view count without requiring authentication', async () => {
    const postId = createTestUUID();

    mockDb.update = vi.fn().mockReturnValue(createChain([]));

    const result = await incrementViewCount(postId);

    expect(result.success).toBe(true);
    expect(mockDb.update).toHaveBeenCalled();
  });

  it('returns { success: false } when db is null', async () => {
    const savedDb = mockDb;
    mockDb = null as any;

    const result = await incrementViewCount(createTestUUID());

    expect(result.success).toBe(false);

    mockDb = savedDb;
  });

  it('returns { success: false } gracefully on db error', async () => {
    const postId = createTestUUID();

    const errorChain = createChain([]);
    errorChain.then = (_: any, onRejected: any) =>
      Promise.reject(new Error('DB error')).catch(onRejected);
    mockDb.update = vi.fn().mockReturnValue(errorChain);

    const result = await incrementViewCount(postId);

    expect(result.success).toBe(false);
  });
});

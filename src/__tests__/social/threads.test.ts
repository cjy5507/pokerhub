/**
 * Tests for src/app/(social)/actions.ts
 *
 * Mock strategy:
 *  - @/lib/db        → mockDb controlled per-test via mockReturnValueOnce chains
 *  - @/lib/auth/session → getSession returns null | session
 *  - next/cache      → revalidatePath is a no-op spy
 *
 * The real source file imports `db` as a named export that may be `null` when
 * the DB is not configured. We mock the entire module so `db` is always the
 * mock object (truthy), letting us exercise the actual business logic.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  mockUserSession,
  mockUser2Session,
  createChainableMock,
  createTestUUID,
  resetMocks,
} from '../helpers/mocks';

// ---------------------------------------------------------------------------
// vi.hoisted() ensures these values exist before vi.mock factories run.
// vi.mock calls are hoisted to the top of the file by Vitest's transformer,
// so any variables they close over must also be hoisted.
// ---------------------------------------------------------------------------

const { mockDb, mockGetSession, mockRevalidatePath } = vi.hoisted(() => {
  const mockDb: any = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    execute: vi.fn(),
    transaction: vi.fn(),
    query: {},
  };
  const mockGetSession = vi.fn();
  const mockRevalidatePath = vi.fn();
  return { mockDb, mockGetSession, mockRevalidatePath };
});

vi.mock('@/lib/db', () => ({ db: mockDb }));
vi.mock('@/lib/auth/session', () => ({ getSession: mockGetSession }));
vi.mock('next/cache', () => ({ revalidatePath: mockRevalidatePath }));

// ---------------------------------------------------------------------------
// Import the module under test AFTER mocks are wired up
// ---------------------------------------------------------------------------

import {
  createThread,
  deleteThread,
  toggleThreadLike,
  createThreadReply,
  getThreadFeed,
  getUserThreads,
  getThreadDetail,
  getThreadReplies,
} from '@/app/(social)/actions';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns a db row that matches the shape getThreadFeed/getThreadDetail select */
function makeThreadRow(overrides: Record<string, any> = {}) {
  return {
    id: createTestUUID(),
    content: '테스트 쓰레드입니다.',
    contentHtml: '<p>테스트 쓰레드입니다.</p>',
    imageUrl: null,
    likesCount: 0,
    repliesCount: 0,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    authorId: mockUserSession.userId,
    authorNickname: mockUserSession.nickname,
    authorAvatarUrl: null,
    authorLevel: 1,
    ...overrides,
  };
}

function makeReplyRow(overrides: Record<string, any> = {}) {
  return {
    id: createTestUUID(),
    content: '테스트 댓글입니다.',
    createdAt: new Date('2024-01-01T01:00:00.000Z'),
    authorId: mockUserSession.userId,
    authorNickname: mockUserSession.nickname,
    authorAvatarUrl: null,
    authorLevel: 1,
    ...overrides,
  };
}

/**
 * Sequence helper: each call in order resolves to the next result.
 * Configures mockReturnValueOnce on mockDb.select / .insert / .update / .delete.
 */
function queueDbCalls(
  calls: Array<{ op: 'select' | 'insert' | 'update' | 'delete'; result: any[] }>
) {
  for (const { op, result } of calls) {
    mockDb[op].mockReturnValueOnce(createChainableMock(result));
  }
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  resetMocks();
  mockGetSession.mockResolvedValue(null);
  mockRevalidatePath.mockReset();
});

// ===========================================================================
// createThread
// ===========================================================================

describe('createThread', () => {
  it('returns error when not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);

    const result = await createThread({ content: '안녕하세요' });

    expect(result.success).toBe(false);
    expect(result.error).toBe('로그인이 필요합니다');
  });

  it('returns error when content is empty string', async () => {
    mockGetSession.mockResolvedValue(mockUserSession);

    const result = await createThread({ content: '' });

    expect(result.success).toBe(false);
    expect(result.error).toBe('내용을 입력해주세요');
  });

  it('returns error when content is only whitespace', async () => {
    mockGetSession.mockResolvedValue(mockUserSession);

    const result = await createThread({ content: '   ' });

    expect(result.success).toBe(false);
    expect(result.error).toBe('내용을 입력해주세요');
  });

  it('returns error when content exceeds 500 characters', async () => {
    mockGetSession.mockResolvedValue(mockUserSession);

    const result = await createThread({ content: 'A'.repeat(501) });

    expect(result.success).toBe(false);
    expect(result.error).toBe('내용은 500자를 초과할 수 없습니다');
  });

  it('allows content at exactly 500 characters', async () => {
    mockGetSession.mockResolvedValue(mockUserSession);
    const threadId = createTestUUID();
    mockDb.insert.mockReturnValueOnce(createChainableMock([{ id: threadId }]));

    const result = await createThread({ content: 'A'.repeat(500) });

    expect(result.success).toBe(true);
    expect(result.threadId).toBe(threadId);
  });

  it('successfully creates a thread and returns threadId', async () => {
    mockGetSession.mockResolvedValue(mockUserSession);
    const threadId = createTestUUID();
    mockDb.insert.mockReturnValueOnce(createChainableMock([{ id: threadId }]));

    const result = await createThread({ content: '새로운 쓰레드 내용입니다.' });

    expect(result.success).toBe(true);
    expect(result.threadId).toBe(threadId);
    expect(mockRevalidatePath).toHaveBeenCalledWith('/threads');
  });

  it('calls insert with HTML-escaped contentHtml', async () => {
    mockGetSession.mockResolvedValue(mockUserSession);
    const threadId = createTestUUID();
    mockDb.insert.mockReturnValueOnce(createChainableMock([{ id: threadId }]));

    await createThread({ content: '<script>alert("xss")</script>' });

    // The insert chain's values() should have been called with escaped HTML
    const insertChain = mockDb.insert.mock.results[0].value;
    const valuesCall = insertChain.values.mock.calls[0][0];
    expect(valuesCall.contentHtml).toContain('&lt;script&gt;');
    expect(valuesCall.contentHtml).not.toContain('<script>');
  });

  it('includes imageUrl when provided', async () => {
    mockGetSession.mockResolvedValue(mockUserSession);
    const threadId = createTestUUID();
    mockDb.insert.mockReturnValueOnce(createChainableMock([{ id: threadId }]));
    const imageUrl = 'https://example.com/image.png';

    const result = await createThread({ content: '이미지 쓰레드', imageUrl });

    expect(result.success).toBe(true);
    const insertChain = mockDb.insert.mock.results[0].value;
    expect(insertChain.values.mock.calls[0][0].imageUrl).toBe(imageUrl);
  });
});

// ===========================================================================
// deleteThread
// ===========================================================================

describe('deleteThread', () => {
  it('returns error when not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);

    const result = await deleteThread('some-thread-id');

    expect(result.success).toBe(false);
    expect(result.error).toBe('로그인이 필요합니다');
  });

  it('returns error when thread is not found', async () => {
    mockGetSession.mockResolvedValue(mockUserSession);
    // select returns empty array → thread not found
    mockDb.select.mockReturnValueOnce(createChainableMock([]));

    const result = await deleteThread('nonexistent-id');

    expect(result.success).toBe(false);
    expect(result.error).toBe('쓰레드를 찾을 수 없습니다');
  });

  it('returns error when user is not the thread owner', async () => {
    mockGetSession.mockResolvedValue(mockUserSession);
    // Thread is owned by a different user
    mockDb.select.mockReturnValueOnce(
      createChainableMock([{ authorId: mockUser2Session.userId }])
    );

    const result = await deleteThread('some-thread-id');

    expect(result.success).toBe(false);
    expect(result.error).toBe('쓰레드를 삭제할 권한이 없습니다');
  });

  it('successfully deletes thread when user is the owner', async () => {
    mockGetSession.mockResolvedValue(mockUserSession);
    // Thread owned by the current user
    mockDb.select.mockReturnValueOnce(
      createChainableMock([{ authorId: mockUserSession.userId }])
    );
    mockDb.delete.mockReturnValueOnce(createChainableMock([]));

    const result = await deleteThread('owned-thread-id');

    expect(result.success).toBe(true);
    expect(mockDb.delete).toHaveBeenCalledTimes(1);
    expect(mockRevalidatePath).toHaveBeenCalledWith('/threads');
  });
});

// ===========================================================================
// toggleThreadLike
// ===========================================================================

describe('toggleThreadLike', () => {
  it('returns error when not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);

    const result = await toggleThreadLike('thread-1');

    expect(result.success).toBe(false);
    expect(result.error).toBe('로그인이 필요합니다');
  });

  it('likes a thread that has no existing like (insert path)', async () => {
    mockGetSession.mockResolvedValue(mockUserSession);
    const threadId = createTestUUID();

    // Call order for the "like" path:
    // 1. select from threadLikes → [] (no existing like)
    // 2. insert into threadLikes → []
    // 3. update threads (increment) → []
    // 4. select threads (get updated count) → [{ likesCount: 1 }]
    queueDbCalls([
      { op: 'select', result: [] },            // check existing like → none
      { op: 'insert', result: [] },             // insert like
      { op: 'update', result: [] },             // increment likesCount
      { op: 'select', result: [{ likesCount: 1 }] }, // fetch updated count
    ]);

    const result = await toggleThreadLike(threadId);

    expect(result.success).toBe(true);
    expect(result.liked).toBe(true);
    expect(result.likesCount).toBe(1);
    expect(mockRevalidatePath).toHaveBeenCalledWith('/threads');
  });

  it('unlikes a thread that already has a like (delete path)', async () => {
    mockGetSession.mockResolvedValue(mockUserSession);
    const threadId = createTestUUID();

    // Call order for the "unlike" path:
    // 1. select from threadLikes → [existing like]
    // 2. delete from threadLikes → []
    // 3. update threads (decrement) → []
    // 4. select threads (get updated count) → [{ likesCount: 0 }]
    queueDbCalls([
      { op: 'select', result: [{ userId: mockUserSession.userId, threadId }] },
      { op: 'delete', result: [] },
      { op: 'update', result: [] },
      { op: 'select', result: [{ likesCount: 0 }] },
    ]);

    const result = await toggleThreadLike(threadId);

    expect(result.success).toBe(true);
    expect(result.liked).toBe(false);
    expect(result.likesCount).toBe(0);
    expect(mockRevalidatePath).toHaveBeenCalledWith('/threads');
  });

  it('returns likesCount of 0 when updated thread is missing (fallback)', async () => {
    mockGetSession.mockResolvedValue(mockUserSession);

    // Like path but final select returns empty (edge case)
    queueDbCalls([
      { op: 'select', result: [] },        // no existing like
      { op: 'insert', result: [] },        // insert like
      { op: 'update', result: [] },        // increment
      { op: 'select', result: [] },        // thread gone
    ]);

    const result = await toggleThreadLike('thread-gone');

    expect(result.success).toBe(true);
    expect(result.liked).toBe(true);
    expect(result.likesCount).toBe(0);
  });
});

// ===========================================================================
// createThreadReply
// ===========================================================================

describe('createThreadReply', () => {
  it('returns error when not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);

    const result = await createThreadReply({ threadId: 'thread-1', content: '댓글' });

    expect(result.success).toBe(false);
    expect(result.error).toBe('로그인이 필요합니다');
  });

  it('returns error when content is empty', async () => {
    mockGetSession.mockResolvedValue(mockUserSession);

    const result = await createThreadReply({ threadId: 'thread-1', content: '' });

    expect(result.success).toBe(false);
    expect(result.error).toBe('댓글 내용을 입력해주세요');
  });

  it('returns error when content is only whitespace', async () => {
    mockGetSession.mockResolvedValue(mockUserSession);

    const result = await createThreadReply({ threadId: 'thread-1', content: '   ' });

    expect(result.success).toBe(false);
    expect(result.error).toBe('댓글 내용을 입력해주세요');
  });

  it('returns error when content exceeds 300 characters', async () => {
    mockGetSession.mockResolvedValue(mockUserSession);

    const result = await createThreadReply({
      threadId: 'thread-1',
      content: 'B'.repeat(301),
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('댓글은 300자를 초과할 수 없습니다');
  });

  it('allows content at exactly 300 characters', async () => {
    mockGetSession.mockResolvedValue(mockUserSession);
    const replyId = createTestUUID();
    // 1. select thread → found
    // 2. insert reply → [{ id: replyId }]
    // 3. update thread repliesCount → []
    queueDbCalls([
      { op: 'select', result: [{ id: 'thread-1' }] },
      { op: 'insert', result: [{ id: replyId }] },
      { op: 'update', result: [] },
    ]);

    const result = await createThreadReply({ threadId: 'thread-1', content: 'B'.repeat(300) });

    expect(result.success).toBe(true);
    expect(result.replyId).toBe(replyId);
  });

  it('returns error when thread is not found', async () => {
    mockGetSession.mockResolvedValue(mockUserSession);
    mockDb.select.mockReturnValueOnce(createChainableMock([]));

    const result = await createThreadReply({ threadId: 'nonexistent', content: '댓글 내용' });

    expect(result.success).toBe(false);
    expect(result.error).toBe('쓰레드를 찾을 수 없습니다');
  });

  it('successfully creates a reply and updates repliesCount', async () => {
    mockGetSession.mockResolvedValue(mockUserSession);
    const replyId = createTestUUID();

    queueDbCalls([
      { op: 'select', result: [{ id: 'thread-1' }] },        // thread exists
      { op: 'insert', result: [{ id: replyId }] },            // insert reply
      { op: 'update', result: [] },                           // increment repliesCount
    ]);

    const result = await createThreadReply({ threadId: 'thread-1', content: '좋은 쓰레드네요!' });

    expect(result.success).toBe(true);
    expect(result.replyId).toBe(replyId);
    expect(mockDb.update).toHaveBeenCalledTimes(1);
    expect(mockRevalidatePath).toHaveBeenCalledWith('/threads');
  });
});

// ===========================================================================
// getThreadFeed
// ===========================================================================

describe('getThreadFeed', () => {
  it('returns empty feed when not authenticated and no threads', async () => {
    mockGetSession.mockResolvedValue(null);
    // First select: thread rows
    mockDb.select.mockReturnValueOnce(createChainableMock([]));

    const result = await getThreadFeed(1);

    expect(result.threads).toHaveLength(0);
    expect(result.hasMore).toBe(false);
  });

  it('returns paginated threads with correct shape', async () => {
    mockGetSession.mockResolvedValue(null);
    const rows = [makeThreadRow(), makeThreadRow()];
    mockDb.select.mockReturnValueOnce(createChainableMock(rows));

    const result = await getThreadFeed(1);

    expect(result.threads).toHaveLength(2);
    const first = result.threads[0];
    expect(first).toHaveProperty('id');
    expect(first).toHaveProperty('author');
    expect(first.author).toHaveProperty('nickname');
    expect(first).toHaveProperty('content');
    expect(first).toHaveProperty('isLiked', false);
    expect(first.createdAt).toBe(new Date('2024-01-01T00:00:00.000Z').toISOString());
  });

  it('sets hasMore to true when result exceeds pageSize (10)', async () => {
    mockGetSession.mockResolvedValue(null);
    // Return 11 rows to signal there is a next page
    const rows = Array.from({ length: 11 }, () => makeThreadRow());
    mockDb.select.mockReturnValueOnce(createChainableMock(rows));

    const result = await getThreadFeed(1);

    // Only 10 are returned but hasMore is true
    expect(result.threads).toHaveLength(10);
    expect(result.hasMore).toBe(true);
  });

  it('fetches liked thread IDs for authenticated users', async () => {
    mockGetSession.mockResolvedValue(mockUserSession);
    const rows = [makeThreadRow({ id: 'thread-liked' }), makeThreadRow({ id: 'thread-not-liked' })];

    // 1st select: thread list; 2nd select: likes
    mockDb.select
      .mockReturnValueOnce(createChainableMock(rows))
      .mockReturnValueOnce(createChainableMock([{ threadId: 'thread-liked' }]));

    const result = await getThreadFeed(1);

    const likedThread = result.threads.find((t) => t.id === 'thread-liked');
    const notLikedThread = result.threads.find((t) => t.id === 'thread-not-liked');
    expect(likedThread?.isLiked).toBe(true);
    expect(notLikedThread?.isLiked).toBe(false);
  });

  it('returns empty on db error', async () => {
    mockGetSession.mockResolvedValue(null);
    mockDb.select.mockReturnValueOnce({
      from: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      offset: vi.fn().mockReturnThis(),
      then: (_resolve: any, reject: any) => reject(new Error('DB connection lost')),
    });

    const result = await getThreadFeed(1);

    expect(result.threads).toHaveLength(0);
    expect(result.hasMore).toBe(false);
  });
});

// ===========================================================================
// getUserThreads
// ===========================================================================

describe('getUserThreads', () => {
  it('returns empty array when user has no threads', async () => {
    mockGetSession.mockResolvedValue(null);
    mockDb.select.mockReturnValueOnce(createChainableMock([]));

    const result = await getUserThreads('some-user-id', 1);

    expect(result.threads).toHaveLength(0);
    expect(result.hasMore).toBe(false);
  });

  it("returns only the specified user's threads", async () => {
    mockGetSession.mockResolvedValue(null);
    const userId = createTestUUID();
    const rows = [
      makeThreadRow({ authorId: userId }),
      makeThreadRow({ authorId: userId }),
    ];
    mockDb.select.mockReturnValueOnce(createChainableMock(rows));

    const result = await getUserThreads(userId, 1);

    expect(result.threads).toHaveLength(2);
    expect(result.threads[0].author.id).toBe(userId);
  });

  it('sets hasMore correctly when 11 results returned for pageSize 10', async () => {
    mockGetSession.mockResolvedValue(null);
    const rows = Array.from({ length: 11 }, () => makeThreadRow());
    mockDb.select.mockReturnValueOnce(createChainableMock(rows));

    const result = await getUserThreads('user-1', 1);

    expect(result.threads).toHaveLength(10);
    expect(result.hasMore).toBe(true);
  });
});

// ===========================================================================
// getThreadDetail
// ===========================================================================

describe('getThreadDetail', () => {
  it('returns null thread when thread is not found', async () => {
    mockGetSession.mockResolvedValue(null);
    // First select (thread) returns empty
    mockDb.select.mockReturnValueOnce(createChainableMock([]));

    const result = await getThreadDetail('nonexistent-id');

    expect(result.thread).toBeNull();
    expect(result.replies).toHaveLength(0);
  });

  it('returns thread with replies when found (unauthenticated)', async () => {
    mockGetSession.mockResolvedValue(null);
    const threadRow = makeThreadRow({ id: 'thread-detail-1' });
    const replyRow = makeReplyRow();

    // 1. select thread → [threadRow]
    // 2. select replies → [replyRow]  (isLiked check is skipped for non-session)
    mockDb.select
      .mockReturnValueOnce(createChainableMock([threadRow]))
      .mockReturnValueOnce(createChainableMock([replyRow]));

    const result = await getThreadDetail('thread-detail-1');

    expect(result.thread).not.toBeNull();
    expect(result.thread?.id).toBe('thread-detail-1');
    expect(result.thread?.isLiked).toBe(false);
    expect(result.replies).toHaveLength(1);
    expect(result.replies[0].content).toBe(replyRow.content);
  });

  it('returns thread with isLiked=true when authenticated user has liked it', async () => {
    mockGetSession.mockResolvedValue(mockUserSession);
    const threadId = createTestUUID();
    const threadRow = makeThreadRow({ id: threadId });
    const likeRow = { userId: mockUserSession.userId, threadId };

    // 1. select thread
    // 2. select like → [likeRow]
    // 3. select replies → []
    mockDb.select
      .mockReturnValueOnce(createChainableMock([threadRow]))
      .mockReturnValueOnce(createChainableMock([likeRow]))
      .mockReturnValueOnce(createChainableMock([]));

    const result = await getThreadDetail(threadId);

    expect(result.thread?.isLiked).toBe(true);
  });

  it('maps reply data correctly with createdAt as ISO string', async () => {
    mockGetSession.mockResolvedValue(null);
    const replyDate = new Date('2024-06-15T12:00:00.000Z');
    const replyRow = makeReplyRow({ createdAt: replyDate });

    mockDb.select
      .mockReturnValueOnce(createChainableMock([makeThreadRow()]))
      .mockReturnValueOnce(createChainableMock([replyRow]));

    const result = await getThreadDetail('thread-1');

    expect(result.replies[0].createdAt).toBe(replyDate.toISOString());
  });
});

// ===========================================================================
// getThreadReplies
// ===========================================================================

describe('getThreadReplies', () => {
  it('returns empty array when there are no replies', async () => {
    mockDb.select.mockReturnValueOnce(createChainableMock([]));

    const result = await getThreadReplies('thread-no-replies');

    expect(result).toHaveLength(0);
  });

  it('returns replies mapped with author info', async () => {
    const reply1 = makeReplyRow({ id: 'reply-a', content: '첫 번째 댓글' });
    const reply2 = makeReplyRow({ id: 'reply-b', content: '두 번째 댓글' });
    mockDb.select.mockReturnValueOnce(createChainableMock([reply1, reply2]));

    const result = await getThreadReplies('thread-1');

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('reply-a');
    expect(result[0].content).toBe('첫 번째 댓글');
    expect(result[0].author.nickname).toBe(mockUserSession.nickname);
    expect(result[1].id).toBe('reply-b');
  });

  it('returns empty array on db error', async () => {
    mockDb.select.mockReturnValueOnce({
      from: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      then: (_resolve: any, reject: any) => reject(new Error('timeout')),
    });

    const result = await getThreadReplies('thread-err');

    expect(result).toHaveLength(0);
  });
});

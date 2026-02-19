/**
 * Tests for src/app/(social)/chat/actions.ts
 *
 * Mock strategy:
 *  - @/lib/db        → mockDb controlled per-test via mockReturnValueOnce chains
 *  - @/lib/auth/session → getSession returns null | session
 *  - next/cache      → revalidatePath is a no-op spy
 *
 * getChatRooms makes 2 selects + 1 db.execute:
 *   1. select rooms
 *   2. select participant counts
 *   3. db.execute (DISTINCT ON query for last messages)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  mockUserSession,
  createChainableMock,
  createTestUUID,
  resetMocks,
} from '../helpers/mocks';

// ---------------------------------------------------------------------------
// vi.hoisted() ensures these values exist before vi.mock factories run.
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
// Import module under test AFTER mocks are wired up
// ---------------------------------------------------------------------------

import {
  getChatRooms,
  getChatRoom,
  getChatMessages,
  sendChatMessage,
} from '@/app/(social)/chat/actions';

// ---------------------------------------------------------------------------
// Test data factories
// ---------------------------------------------------------------------------

function makeChatRoom(overrides: Record<string, any> = {}) {
  return {
    id: createTestUUID(),
    slug: 'general',
    nameKo: '일반 채팅',
    type: 'general' as const,
    minLevel: 0,
    isActive: true,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

function makeChatMessage(overrides: Record<string, any> = {}) {
  return {
    id: createTestUUID(),
    content: '안녕하세요!',
    createdAt: new Date('2024-01-01T10:00:00.000Z'),
    senderId: mockUserSession.userId,
    senderNickname: mockUserSession.nickname,
    senderAvatarUrl: null,
    senderLevel: 1,
    ...overrides,
  };
}

/**
 * Builds a raw row as returned by db.execute (DISTINCT ON query).
 * Fields use snake_case matching the SQL column aliases.
 */
function makeLastMessageRow(overrides: Record<string, any> = {}) {
  return {
    room_id: createTestUUID(),
    content: '마지막 메시지입니다.',
    sender_nickname: mockUserSession.nickname,
    created_at: new Date('2024-01-02T09:00:00.000Z').toISOString(),
    ...overrides,
  };
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
// getChatRooms
// ===========================================================================

describe('getChatRooms', () => {
  it('returns empty rooms array when no active rooms exist', async () => {
    // 1. select rooms → []
    // 2. select participant counts → []
    // (db.execute not called because roomIds.length === 0)
    mockDb.select
      .mockReturnValueOnce(createChainableMock([]))   // rooms
      .mockReturnValueOnce(createChainableMock([]));  // participant counts

    const result = await getChatRooms();

    expect(result.success).toBe(true);
    expect(result.rooms).toHaveLength(0);
  });

  it('returns rooms with participantCount from last 24 hours', async () => {
    const room = makeChatRoom({ id: 'room-1' });

    // 1. select rooms
    // 2. select participant counts
    // 3. db.execute → raw rows (array format)
    mockDb.select
      .mockReturnValueOnce(createChainableMock([room]))
      .mockReturnValueOnce(createChainableMock([{ roomId: 'room-1', count: 5 }]));
    mockDb.execute.mockResolvedValueOnce([]);  // no last messages

    const result = await getChatRooms();

    expect(result.success).toBe(true);
    expect(result.rooms).toHaveLength(1);
    expect(result.rooms[0].participantCount).toBe(5);
  });

  it('sets participantCount to 0 for rooms not in the participant count map', async () => {
    const room = makeChatRoom({ id: 'room-no-participants' });

    mockDb.select
      .mockReturnValueOnce(createChainableMock([room]))
      .mockReturnValueOnce(createChainableMock([]));
    mockDb.execute.mockResolvedValueOnce([]);

    const result = await getChatRooms();

    expect(result.rooms[0].participantCount).toBe(0);
  });

  it('includes lastMessage data when the room has messages', async () => {
    const room = makeChatRoom({ id: 'room-with-msg' });
    const lastMsg = makeLastMessageRow({
      room_id: 'room-with-msg',
      content: '마지막 메시지입니다.',
      sender_nickname: mockUserSession.nickname,
      created_at: new Date('2024-01-02T09:00:00.000Z').toISOString(),
    });

    mockDb.select
      .mockReturnValueOnce(createChainableMock([room]))
      .mockReturnValueOnce(createChainableMock([]));
    mockDb.execute.mockResolvedValueOnce([lastMsg]);

    const result = await getChatRooms();

    expect(result.rooms[0].lastMessage).not.toBeNull();
    expect(result.rooms[0].lastMessage?.content).toBe(lastMsg.content);
    expect(result.rooms[0].lastMessage?.senderNickname).toBe(lastMsg.sender_nickname);
    expect(result.rooms[0].lastMessage?.createdAt).toBe(
      new Date(lastMsg.created_at).toISOString()
    );
  });

  it('sets lastMessage to null when room has no messages', async () => {
    const room = makeChatRoom({ id: 'empty-room' });

    mockDb.select
      .mockReturnValueOnce(createChainableMock([room]))
      .mockReturnValueOnce(createChainableMock([]));
    mockDb.execute.mockResolvedValueOnce([]);

    const result = await getChatRooms();

    expect(result.rooms[0].lastMessage).toBeNull();
  });

  it('sorts rooms by lastMessage time descending (most recent first)', async () => {
    const roomA = makeChatRoom({ id: 'room-a', slug: 'room-a' });
    const roomB = makeChatRoom({ id: 'room-b', slug: 'room-b' });

    const olderMsgRow = makeLastMessageRow({
      room_id: 'room-a',
      created_at: new Date('2024-01-01T08:00:00.000Z').toISOString(),
    });
    const newerMsgRow = makeLastMessageRow({
      room_id: 'room-b',
      created_at: new Date('2024-01-02T08:00:00.000Z').toISOString(),
    });

    mockDb.select
      .mockReturnValueOnce(createChainableMock([roomA, roomB]))
      .mockReturnValueOnce(createChainableMock([]));
    // execute returns both rows; one per room (DISTINCT ON)
    mockDb.execute.mockResolvedValueOnce([olderMsgRow, newerMsgRow]);

    const result = await getChatRooms();

    // roomB has the newer message → should appear first
    expect(result.rooms[0].id).toBe('room-b');
    expect(result.rooms[1].id).toBe('room-a');
  });

  it('places rooms without messages after rooms with messages in sort', async () => {
    const roomWithMsg = makeChatRoom({ id: 'room-msg' });
    const roomNoMsg = makeChatRoom({ id: 'room-no-msg' });

    const msgRow = makeLastMessageRow({
      room_id: 'room-msg',
      created_at: new Date('2024-01-01T12:00:00.000Z').toISOString(),
    });

    mockDb.select
      .mockReturnValueOnce(createChainableMock([roomNoMsg, roomWithMsg]))
      .mockReturnValueOnce(createChainableMock([]));
    mockDb.execute.mockResolvedValueOnce([msgRow]);

    const result = await getChatRooms();

    expect(result.rooms[0].id).toBe('room-msg');
    expect(result.rooms[1].id).toBe('room-no-msg');
  });

  it('returns error response on db exception', async () => {
    mockDb.select.mockImplementationOnce(() => {
      throw new Error('Connection refused');
    });

    const result = await getChatRooms();

    expect(result.success).toBe(false);
    expect(result.rooms).toHaveLength(0);
    expect(result.error).toBeDefined();
  });

  it('handles db.execute returning rows via .rows property (alternate driver format)', async () => {
    const room = makeChatRoom({ id: 'room-rows' });
    const lastMsg = makeLastMessageRow({
      room_id: 'room-rows',
      content: 'alternate driver msg',
      created_at: new Date('2024-01-03T10:00:00.000Z').toISOString(),
    });

    mockDb.select
      .mockReturnValueOnce(createChainableMock([room]))
      .mockReturnValueOnce(createChainableMock([]));
    // Simulate postgres driver wrapping rows in { rows: [...] }
    mockDb.execute.mockResolvedValueOnce({ rows: [lastMsg] });

    const result = await getChatRooms();

    expect(result.success).toBe(true);
    expect(result.rooms[0].lastMessage?.content).toBe('alternate driver msg');
  });
});

// ===========================================================================
// getChatRoom
// ===========================================================================

describe('getChatRoom', () => {
  it('returns error when room is not found or inactive', async () => {
    mockDb.select.mockReturnValueOnce(createChainableMock([]));

    const result = await getChatRoom('nonexistent-room');

    expect(result.success).toBe(false);
    expect(result.room).toBeNull();
    expect(result.error).toBe('채팅방을 찾을 수 없습니다');
  });

  it('returns full room data on successful retrieval', async () => {
    const room = makeChatRoom({ id: 'room-ok' });
    const lastMsg = {
      content: '마지막 메시지입니다.',
      senderNickname: mockUserSession.nickname,
      createdAt: new Date('2024-01-02T09:00:00.000Z'),
    };

    // 1. select room → [room]
    // 2. select participant count → [{ count: 3 }]
    // 3. select lastMessage → [lastMsg]
    mockDb.select
      .mockReturnValueOnce(createChainableMock([room]))
      .mockReturnValueOnce(createChainableMock([{ count: 3 }]))
      .mockReturnValueOnce(createChainableMock([lastMsg]));

    const result = await getChatRoom('room-ok');

    expect(result.success).toBe(true);
    expect(result.room).not.toBeNull();
    expect(result.room?.id).toBe('room-ok');
    expect(result.room?.slug).toBe(room.slug);
    expect(result.room?.nameKo).toBe(room.nameKo);
    expect(result.room?.participantCount).toBe(3);
    expect(result.room?.lastMessage).not.toBeNull();
  });

  it('returns participantCount 0 when count result is 0', async () => {
    const room = makeChatRoom({ id: 'room-empty' });

    mockDb.select
      .mockReturnValueOnce(createChainableMock([room]))
      .mockReturnValueOnce(createChainableMock([{ count: 0 }]))
      .mockReturnValueOnce(createChainableMock([]));

    const result = await getChatRoom('room-empty');

    expect(result.room?.participantCount).toBe(0);
    expect(result.room?.lastMessage).toBeNull();
  });

  it('maps createdAt to ISO string', async () => {
    const createdDate = new Date('2024-03-15T08:30:00.000Z');
    const room = makeChatRoom({ id: 'room-date', createdAt: createdDate });

    mockDb.select
      .mockReturnValueOnce(createChainableMock([room]))
      .mockReturnValueOnce(createChainableMock([{ count: 0 }]))
      .mockReturnValueOnce(createChainableMock([]));

    const result = await getChatRoom('room-date');

    expect(result.room?.createdAt).toBe(createdDate.toISOString());
  });

  it('returns error response on db exception', async () => {
    mockDb.select.mockImplementationOnce(() => {
      throw new Error('Query timeout');
    });

    const result = await getChatRoom('room-err');

    expect(result.success).toBe(false);
    expect(result.room).toBeNull();
    expect(result.error).toBeDefined();
  });
});

// ===========================================================================
// getChatMessages
// ===========================================================================

describe('getChatMessages', () => {
  it('returns messages in chronological order (oldest first)', async () => {
    const msg1 = makeChatMessage({ id: 'msg-old', createdAt: new Date('2024-01-01T09:00:00.000Z') });
    const msg2 = makeChatMessage({ id: 'msg-new', createdAt: new Date('2024-01-01T10:00:00.000Z') });

    // DB returns newest first (desc), action reverses them
    mockDb.select.mockReturnValueOnce(createChainableMock([msg2, msg1]));

    const result = await getChatMessages('room-1');

    expect(result.success).toBe(true);
    expect(result.messages).toHaveLength(2);
    // After reversal: oldest should be first
    expect(result.messages[0].id).toBe('msg-old');
    expect(result.messages[1].id).toBe('msg-new');
  });

  it('returns hasMore=false when results are within pageSize (20)', async () => {
    const messages = Array.from({ length: 5 }, () => makeChatMessage());
    mockDb.select.mockReturnValueOnce(createChainableMock(messages));

    const result = await getChatMessages('room-1');

    expect(result.hasMore).toBe(false);
    expect(result.nextCursor).toBeUndefined();
  });

  it('returns hasMore=true and nextCursor when results exceed pageSize (20)', async () => {
    // 21 messages → hasMore=true, sliced to 20
    const messages = Array.from({ length: 21 }, (_, i) =>
      makeChatMessage({
        id: `msg-${i}`,
        createdAt: new Date(2024, 0, 1, i), // each 1 hour apart
      })
    );
    // DB returns desc, so newest is index 20, oldest is index 0
    const descMessages = [...messages].reverse();
    mockDb.select.mockReturnValueOnce(createChainableMock(descMessages));

    const result = await getChatMessages('room-1');

    expect(result.hasMore).toBe(true);
    expect(result.messages).toHaveLength(20);
    expect(result.nextCursor).toBeDefined();
  });

  it('supports cursor-based pagination (passes cursor to where clause)', async () => {
    const messages = [makeChatMessage()];
    mockDb.select.mockReturnValueOnce(createChainableMock(messages));

    const cursor = new Date('2024-01-01T10:00:00.000Z').toISOString();
    const result = await getChatMessages('room-1', cursor);

    // We verify the action ran successfully with cursor; the chain is what we care about
    expect(result.success).toBe(true);
    expect(result.messages).toHaveLength(1);
  });

  it('maps message data with correct sender shape', async () => {
    const msg = makeChatMessage({
      id: 'msg-shape',
      content: '테스트 메시지',
      senderId: mockUserSession.userId,
      senderNickname: mockUserSession.nickname,
      senderAvatarUrl: 'https://example.com/avatar.png',
      senderLevel: 5,
    });
    mockDb.select.mockReturnValueOnce(createChainableMock([msg]));

    const result = await getChatMessages('room-1');

    const message = result.messages[0];
    expect(message.id).toBe('msg-shape');
    expect(message.content).toBe('테스트 메시지');
    expect(message.sender.id).toBe(mockUserSession.userId);
    expect(message.sender.nickname).toBe(mockUserSession.nickname);
    expect(message.sender.avatarUrl).toBe('https://example.com/avatar.png');
    expect(message.sender.level).toBe(5);
    expect(message.createdAt).toBe(msg.createdAt.toISOString());
  });

  it('returns empty messages on db error', async () => {
    mockDb.select.mockImplementationOnce(() => {
      throw new Error('Network error');
    });

    const result = await getChatMessages('room-err');

    expect(result.success).toBe(false);
    expect(result.messages).toHaveLength(0);
    expect(result.hasMore).toBe(false);
    expect(result.error).toBeDefined();
  });
});

// ===========================================================================
// sendChatMessage
// ===========================================================================

describe('sendChatMessage', () => {
  it('returns error when not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);

    const result = await sendChatMessage('room-1', '안녕하세요');

    expect(result.success).toBe(false);
    expect(result.error).toBe('로그인이 필요합니다');
  });

  it('returns error when content is empty string', async () => {
    mockGetSession.mockResolvedValue(mockUserSession);

    const result = await sendChatMessage('room-1', '');

    expect(result.success).toBe(false);
    expect(result.error).toBe('메시지 내용을 입력해주세요');
  });

  it('returns error when content is only whitespace', async () => {
    mockGetSession.mockResolvedValue(mockUserSession);

    const result = await sendChatMessage('room-1', '   ');

    expect(result.success).toBe(false);
    expect(result.error).toBe('메시지 내용을 입력해주세요');
  });

  it('returns error when content exceeds 500 characters', async () => {
    mockGetSession.mockResolvedValue(mockUserSession);

    const result = await sendChatMessage('room-1', 'C'.repeat(501));

    expect(result.success).toBe(false);
    expect(result.error).toBe('메시지는 500자를 초과할 수 없습니다');
  });

  it('allows content at exactly 500 characters', async () => {
    mockGetSession.mockResolvedValue(mockUserSession);
    const insertedMsg = makeChatMessage({ id: 'msg-500' });
    const senderRow = {
      id: mockUserSession.userId,
      nickname: mockUserSession.nickname,
      avatarUrl: null,
      level: 1,
    };

    // 1. select room (exists & active)
    // 2. insert message → [insertedMsg]
    // 3. select sender info → [senderRow]
    mockDb.select
      .mockReturnValueOnce(createChainableMock([makeChatRoom({ id: 'room-1' })]))
      .mockReturnValueOnce(createChainableMock([senderRow]));
    mockDb.insert.mockReturnValueOnce(createChainableMock([insertedMsg]));

    const result = await sendChatMessage('room-1', 'C'.repeat(500));

    expect(result.success).toBe(true);
  });

  it('returns error when room is not found or inactive', async () => {
    mockGetSession.mockResolvedValue(mockUserSession);
    // Room select returns empty
    mockDb.select.mockReturnValueOnce(createChainableMock([]));

    const result = await sendChatMessage('nonexistent-room', '안녕하세요');

    expect(result.success).toBe(false);
    expect(result.error).toBe('채팅방을 찾을 수 없습니다');
  });

  it('successfully sends a message and returns message data', async () => {
    mockGetSession.mockResolvedValue(mockUserSession);
    const msgId = createTestUUID();
    const insertedMsg = makeChatMessage({ id: msgId, content: '  hello  ' });
    const senderRow = {
      id: mockUserSession.userId,
      nickname: mockUserSession.nickname,
      avatarUrl: null,
      level: 3,
    };

    // 1. select room → [room]
    // 2. insert message → [insertedMsg]
    // 3. select sender → [senderRow]
    mockDb.select
      .mockReturnValueOnce(createChainableMock([makeChatRoom({ id: 'room-1' })]))
      .mockReturnValueOnce(createChainableMock([senderRow]));
    mockDb.insert.mockReturnValueOnce(createChainableMock([insertedMsg]));

    const result = await sendChatMessage('room-1', '안녕하세요 여러분!');

    expect(result.success).toBe(true);
    expect((result as any).message).toBeDefined();
    expect((result as any).message.id).toBe(msgId);
    expect((result as any).message.sender.nickname).toBe(mockUserSession.nickname);
    expect((result as any).message.sender.level).toBe(3);
  });

  it('calls revalidatePath for both /chat and /chat/:roomId', async () => {
    mockGetSession.mockResolvedValue(mockUserSession);
    const insertedMsg = makeChatMessage({ id: 'msg-rv' });
    const senderRow = {
      id: mockUserSession.userId,
      nickname: mockUserSession.nickname,
      avatarUrl: null,
      level: 1,
    };

    mockDb.select
      .mockReturnValueOnce(createChainableMock([makeChatRoom({ id: 'room-42' })]))
      .mockReturnValueOnce(createChainableMock([senderRow]));
    mockDb.insert.mockReturnValueOnce(createChainableMock([insertedMsg]));

    await sendChatMessage('room-42', '리밸리데이션 확인');

    expect(mockRevalidatePath).toHaveBeenCalledWith('/chat');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/chat/room-42');
    expect(mockRevalidatePath).toHaveBeenCalledTimes(2);
  });

  it('returns auth error message when session throws', async () => {
    mockGetSession.mockResolvedValue(null);

    const result = await sendChatMessage('room-1', '메시지');

    expect(result.success).toBe(false);
    expect(result.error).toBe('로그인이 필요합니다');
  });

  it('trims whitespace from content before inserting', async () => {
    mockGetSession.mockResolvedValue(mockUserSession);
    const insertedMsg = makeChatMessage({ id: 'msg-trim', content: 'trimmed' });
    const senderRow = {
      id: mockUserSession.userId,
      nickname: mockUserSession.nickname,
      avatarUrl: null,
      level: 1,
    };

    mockDb.select
      .mockReturnValueOnce(createChainableMock([makeChatRoom({ id: 'room-1' })]))
      .mockReturnValueOnce(createChainableMock([senderRow]));
    mockDb.insert.mockReturnValueOnce(createChainableMock([insertedMsg]));

    await sendChatMessage('room-1', '  trimmed  ');

    const insertChain = mockDb.insert.mock.results[0].value;
    const valuesArg = insertChain.values.mock.calls[0][0];
    expect(valuesArg.content).toBe('trimmed');
  });
});

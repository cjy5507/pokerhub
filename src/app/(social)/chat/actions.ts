'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { chatRooms, chatMessages, users } from '@/lib/db/schema';
import { getSession } from '@/lib/auth/session';
import { eq, and, desc, sql, count } from 'drizzle-orm';

// ==================== TYPES ====================

interface ChatRoomAuthor {
  id: string;
  nickname: string;
  avatarUrl: string | null;
  level: number;
}

export interface ChatRoomData {
  id: string;
  slug: string;
  nameKo: string;
  type: 'general' | 'game' | 'tournament' | 'private';
  minLevel: number;
  participantCount: number;
  lastMessage: {
    content: string;
    senderNickname: string;
    createdAt: string;
  } | null;
  createdAt: string;
}

export interface ChatMessageData {
  id: string;
  sender: ChatRoomAuthor;
  content: string;
  createdAt: string;
}

// ==================== VALIDATION HELPERS ====================

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isValidUUID(id: string): boolean {
  return UUID_REGEX.test(id);
}

// ==================== HELPER FUNCTIONS ====================

async function requireAuth() {
  const session = await getSession();
  if (!session) {
    throw new Error('로그인이 필요합니다');
  }
  return session;
}

// ==================== ACTIONS ====================

/**
 * Get all chat rooms
 */
export async function getChatRooms() {
  if (!db) return { success: false, rooms: [], error: 'Database not available' };
  try {
    // Get all active rooms
    const rooms = await db
      .select()
      .from(chatRooms)
      .where(eq(chatRooms.isActive, true))
      .orderBy(chatRooms.createdAt);

    // Get participant counts for last 24 hours
    const participantCounts = await db
      .select({
        roomId: chatMessages.roomId,
        count: sql<number>`count(DISTINCT ${chatMessages.senderId})`,
      })
      .from(chatMessages)
      .where(sql`${chatMessages.createdAt} > NOW() - INTERVAL '24 hours'`)
      .groupBy(chatMessages.roomId);

    const participantCountMap = new Map(
      participantCounts.map((pc: any) => [pc.roomId, Number(pc.count)])
    );

    // Get last message for each room in a single query using DISTINCT ON
    const roomIds = rooms.map((r: any) => r.id);

    type LastMessageRow = { room_id: string; content: string; created_at: string; sender_nickname: string };
    let lastMessageRows: LastMessageRow[] = [];
    if (roomIds.length > 0) {
      const rawResult = await db.execute(
        sql`
          SELECT DISTINCT ON (cm.room_id)
            cm.room_id,
            cm.content,
            cm.created_at,
            u.nickname AS sender_nickname
          FROM chat_messages cm
          INNER JOIN users u ON cm.sender_id = u.id
          WHERE cm.room_id IN (${sql.join(roomIds.map((id: string) => sql`${id}::uuid`), sql`, `)})
          ORDER BY cm.room_id, cm.created_at DESC
        `
      );
      // postgres-js driver returns rows directly as an array; some wrappers use .rows
      lastMessageRows = Array.isArray(rawResult)
        ? (rawResult as LastMessageRow[])
        : Array.isArray((rawResult as Record<string, unknown>)?.rows)
          ? ((rawResult as Record<string, unknown>).rows as LastMessageRow[])
          : [];
    }

    const lastMessageMap = new Map(
      lastMessageRows.map((row) => [
        row.room_id,
        {
          content: row.content,
          senderNickname: row.sender_nickname,
          createdAt: new Date(row.created_at).toISOString(),
        },
      ])
    );

    const roomsWithData: ChatRoomData[] = rooms.map((room: any) => ({
      id: room.id,
      slug: room.slug,
      nameKo: room.nameKo,
      type: room.type,
      minLevel: room.minLevel,
      participantCount: participantCountMap.get(room.id) || 0,
      lastMessage: lastMessageMap.get(room.id) ?? null,
      createdAt: room.createdAt.toISOString(),
    }));

    // Sort by last message time
    roomsWithData.sort((a, b) => {
      const aTime = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
      const bTime = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
      return bTime - aTime;
    });

    return { success: true, rooms: roomsWithData };
  } catch (error) {
    console.error('Get chat rooms error:', error);
    return { success: false, rooms: [], error: '채팅방 목록을 불러오는 중 오류가 발생했습니다' };
  }
}

/**
 * Get single chat room details
 */
export async function getChatRoom(roomId: string) {
  if (!db) return { success: false, room: null, error: 'Database not available' };
  if (!roomId || !isValidUUID(roomId)) {
    return { success: false, room: null, error: '유효하지 않은 채팅방입니다' };
  }
  try {
    const roomResult = await db
      .select()
      .from(chatRooms)
      .where(and(eq(chatRooms.id, roomId), eq(chatRooms.isActive, true)))
      .limit(1);

    if (roomResult.length === 0) {
      return { success: false, room: null, error: '채팅방을 찾을 수 없습니다' };
    }

    const room = roomResult[0];

    // Get participant count for last 24 hours
    const participantCountResult = await db
      .select({
        count: sql<number>`count(DISTINCT ${chatMessages.senderId})`,
      })
      .from(chatMessages)
      .where(
        and(
          eq(chatMessages.roomId, room.id),
          sql`${chatMessages.createdAt} > NOW() - INTERVAL '24 hours'`
        )
      );

    // Get last message
    const lastMessageResult = await db
      .select({
        content: chatMessages.content,
        senderNickname: users.nickname,
        createdAt: chatMessages.createdAt,
      })
      .from(chatMessages)
      .innerJoin(users, eq(chatMessages.senderId, users.id))
      .where(eq(chatMessages.roomId, room.id))
      .orderBy(desc(chatMessages.createdAt))
      .limit(1);

    const roomData: ChatRoomData = {
      id: room.id,
      slug: room.slug,
      nameKo: room.nameKo,
      type: room.type,
      minLevel: room.minLevel,
      participantCount: Number(participantCountResult[0].count) || 0,
      lastMessage: lastMessageResult[0]
        ? {
            content: lastMessageResult[0].content,
            senderNickname: lastMessageResult[0].senderNickname,
            createdAt: lastMessageResult[0].createdAt.toISOString(),
          }
        : null,
      createdAt: room.createdAt.toISOString(),
    };

    return { success: true, room: roomData };
  } catch (error) {
    console.error('Get chat room error:', error);
    return { success: false, room: null, error: '채팅방 정보를 불러오는 중 오류가 발생했습니다' };
  }
}

/**
 * Get chat messages with pagination
 */
export async function getChatMessages(roomId: string, cursor?: string) {
  if (!db) return { success: false, messages: [], hasMore: false, error: 'Database not available' };
  if (!roomId || !isValidUUID(roomId)) {
    return { success: false, messages: [], hasMore: false, error: '유효하지 않은 채팅방입니다' };
  }
  try {
    const pageSize = 20;

    // Build where conditions
    const whereConditions = cursor
      ? and(
          eq(chatMessages.roomId, roomId),
          sql`${chatMessages.createdAt} < ${new Date(cursor)}`
        )
      : eq(chatMessages.roomId, roomId);

    const results = await db
      .select({
        id: chatMessages.id,
        content: chatMessages.content,
        createdAt: chatMessages.createdAt,
        senderId: users.id,
        senderNickname: users.nickname,
        senderAvatarUrl: users.avatarUrl,
        senderLevel: users.level,
      })
      .from(chatMessages)
      .innerJoin(users, eq(chatMessages.senderId, users.id))
      .where(whereConditions)
      .orderBy(desc(chatMessages.createdAt))
      .limit(pageSize + 1);

    const hasMore = results.length > pageSize;
    const messages = results.slice(0, pageSize);

    // Reverse to show oldest first
    const formattedMessages: ChatMessageData[] = messages.reverse().map((msg: any) => ({
      id: msg.id,
      sender: {
        id: msg.senderId,
        nickname: msg.senderNickname,
        avatarUrl: msg.senderAvatarUrl,
        level: msg.senderLevel,
      },
      content: msg.content,
      createdAt: msg.createdAt.toISOString(),
    }));

    const nextCursor = hasMore ? messages[0].createdAt.toISOString() : undefined;

    return {
      success: true,
      messages: formattedMessages,
      hasMore,
      nextCursor,
    };
  } catch (error) {
    console.error('Get chat messages error:', error);
    return {
      success: false,
      messages: [],
      hasMore: false,
      error: '메시지를 불러오는 중 오류가 발생했습니다',
    };
  }
}

/**
 * Send a chat message
 */
export async function sendChatMessage(roomId: string, content: string) {
  if (!db) return { success: false, error: 'Database not available' };
  try {
    const session = await requireAuth();

    // Validate roomId format (UUID)
    if (!roomId || !isValidUUID(roomId)) {
      return { success: false, error: '유효하지 않은 채팅방입니다' };
    }

    if (!content || content.trim().length === 0) {
      return { success: false, error: '메시지 내용을 입력해주세요' };
    }

    if (content.length > 500) {
      return { success: false, error: '메시지는 500자를 초과할 수 없습니다' };
    }

    // Check if room exists and is active
    const roomResult = await db
      .select()
      .from(chatRooms)
      .where(and(eq(chatRooms.id, roomId), eq(chatRooms.isActive, true)))
      .limit(1);

    if (roomResult.length === 0) {
      return { success: false, error: '채팅방을 찾을 수 없습니다' };
    }

    const room = roomResult[0];

    // C1: Enforce minLevel access control
    if (room.minLevel > 0) {
      const [sender] = await db
        .select({ level: users.level })
        .from(users)
        .where(eq(users.id, session.userId))
        .limit(1);

      if (!sender || sender.level < room.minLevel) {
        return { success: false, error: `이 채팅방은 레벨 ${room.minLevel} 이상만 참여할 수 있습니다` };
      }
    }

    // Insert message
    const [insertedMessage] = await db
      .insert(chatMessages)
      .values({
        roomId,
        senderId: session.userId,
        content: content.trim(),
        type: 'text',
      })
      .returning();

    // Get sender info
    const [senderInfo] = await db
      .select({
        id: users.id,
        nickname: users.nickname,
        avatarUrl: users.avatarUrl,
        level: users.level,
      })
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);

    const newMessage: ChatMessageData = {
      id: insertedMessage.id,
      sender: {
        id: senderInfo.id,
        nickname: senderInfo.nickname,
        avatarUrl: senderInfo.avatarUrl,
        level: senderInfo.level,
      },
      content: insertedMessage.content,
      createdAt: insertedMessage.createdAt.toISOString(),
    };

    revalidatePath('/chat');
    revalidatePath(`/chat/${roomId}`);

    return { success: true, message: newMessage };
  } catch (error) {
    console.error('Send chat message error:', error);
    if (error instanceof Error && error.message === '로그인이 필요합니다') {
      return { success: false, error: error.message };
    }
    return { success: false, error: '메시지 전송 중 오류가 발생했습니다' };
  }
}

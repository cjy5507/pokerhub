import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { chatMessages, users } from '@/lib/db/schema';
import { eq, and, gt, desc } from 'drizzle-orm';

/**
 * Server-Sent Events endpoint for real-time chat messages.
 * Polls DB every 2 seconds for new messages in the room.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: 'connected', timestamp: Date.now() })}\n\n`)
      );

      if (!db) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'error', message: 'Database not available' })}\n\n`)
        );
        controller.close();
        return;
      }

      let pollTimer: ReturnType<typeof setTimeout> | null = null;
      let stopped = false;
      let lastCreatedAt: Date | null = null;
      let heartbeatCount = 0;

      // Get the most recent message timestamp to start from
      try {
        const latest = await db
          .select({ createdAt: chatMessages.createdAt })
          .from(chatMessages)
          .where(eq(chatMessages.roomId, roomId))
          .orderBy(desc(chatMessages.createdAt))
          .limit(1);

        if (latest.length > 0) {
          lastCreatedAt = latest[0].createdAt;
        }
      } catch (err) {
        console.error('Chat SSE init error:', err);
      }

      async function poll() {
        if (stopped) return;

        try {
          // Build query for new messages only
          const whereConditions = lastCreatedAt
            ? and(
                eq(chatMessages.roomId, roomId),
                gt(chatMessages.createdAt, lastCreatedAt!)
              )
            : eq(chatMessages.roomId, roomId);

          const newMessages = await db!
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
            .orderBy(chatMessages.createdAt);

          if (newMessages.length > 0) {
            for (const msg of newMessages) {
              const messageData = JSON.stringify({
                type: 'message',
                data: {
                  id: msg.id,
                  content: msg.content,
                  createdAt: msg.createdAt.toISOString(),
                  sender: {
                    id: msg.senderId,
                    nickname: msg.senderNickname,
                    avatarUrl: msg.senderAvatarUrl,
                    level: msg.senderLevel,
                  },
                },
              });
              controller.enqueue(encoder.encode(`data: ${messageData}\n\n`));
            }
            lastCreatedAt = newMessages[newMessages.length - 1].createdAt;
            heartbeatCount = 0;
          } else {
            // Send heartbeat every ~15 seconds (every 7-8 polls at 2s interval)
            heartbeatCount++;
            if (heartbeatCount >= 7) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'heartbeat', timestamp: Date.now() })}\n\n`)
              );
              heartbeatCount = 0;
            }
          }

          schedulePoll(2000);
        } catch (error) {
          console.error('Chat SSE poll error:', error);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({
              type: 'error',
              message: error instanceof Error ? error.message : 'Unknown error',
            })}\n\n`)
          );
          schedulePoll(2000);
        }
      }

      function schedulePoll(ms: number) {
        if (stopped) return;
        pollTimer = setTimeout(poll, ms);
      }

      // Start first poll after a short delay
      schedulePoll(500);

      // Cleanup on disconnect
      request.signal.addEventListener('abort', () => {
        stopped = true;
        if (pollTimer) clearTimeout(pollTimer);
        try {
          controller.close();
        } catch {
          // Already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

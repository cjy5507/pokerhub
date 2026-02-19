import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { pokerTables, pokerGameHands, pokerTableSeats } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { processAction, startNewHand } from '@/lib/poker/gameLoop';
import { broadcastTableUpdate } from '@/lib/poker/broadcast';

const TURN_TIMEOUT_SECONDS = 30;
const WATCHDOG_INTERVAL = 3000;
const KEEPALIVE_INTERVAL = 30000;

/**
 * SSE watchdog endpoint for poker tables.
 * Handles: auto-fold timeout, auto-start hand, auto-close empty tables.
 * Does NOT send game state to clients (they use Supabase Realtime).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tableId: string }> }
) {
  const { tableId } = await params;

  const encoder = new TextEncoder();
  let isProcessingTimeout = false;
  let isStartingHand = false;

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'connected', timestamp: Date.now() })}\n\n`));

      if (!db) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'error', message: 'Database not available' })}\n\n`)
        );
        controller.close();
        return;
      }

      let watchdogTimer: ReturnType<typeof setTimeout> | null = null;
      let keepaliveTimer: ReturnType<typeof setInterval> | null = null;
      let stopped = false;

      // Keepalive ping every 30s to prevent connection drop
      keepaliveTimer = setInterval(() => {
        if (stopped) return;
        try {
          controller.enqueue(encoder.encode(`: keepalive\n\n`));
        } catch {
          // Connection closed
        }
      }, KEEPALIVE_INTERVAL);

      async function watchdog() {
        if (stopped) return;
        try {
          const table = await db!
            .select()
            .from(pokerTables)
            .where(eq(pokerTables.id, tableId))
            .limit(1)
            .then((rows: any) => rows[0]);

          if (!table) {
            stopped = true;
            controller.close();
            return;
          }

          // ── Auto-close empty table after 10 minutes ──
          const seatCount = await db!
            .select({ count: sql`count(*)::int` })
            .from(pokerTableSeats)
            .where(eq(pokerTableSeats.tableId, tableId))
            .then((rows: any) => rows[0]?.count ?? 0);

          if (seatCount === 0 && table.lastActivityAt) {
            const inactiveMs = Date.now() - new Date(table.lastActivityAt).getTime();
            if (inactiveMs >= 10 * 60 * 1000) {
              await db!
                .update(pokerTables)
                .set({ status: 'closed' })
                .where(eq(pokerTables.id, tableId));
              await broadcastTableUpdate(tableId, 'table_closed');
              stopped = true;
              controller.close();
              return;
            }
          }

          // ── Auto-start hand ──
          if (table.status === 'waiting' && !table.currentHandId && !isStartingHand) {
            if (table.lastActivityAt) {
              const timeSinceActivity = Date.now() - new Date(table.lastActivityAt).getTime();
              if (timeSinceActivity < 3000) {
                scheduleWatchdog();
                return;
              }
            }

            const activePlayerCount = await db!
              .select({ count: sql`count(*)::int` })
              .from(pokerTableSeats)
              .where(
                and(
                  eq(pokerTableSeats.tableId, tableId),
                  eq(pokerTableSeats.isActive, true),
                  eq(pokerTableSeats.isSittingOut, false)
                )
              )
              .then((rows: any) => rows[0]?.count ?? 0);

            if (activePlayerCount >= 2) {
              isStartingHand = true;
              try {
                const result = await startNewHand(tableId);
                if (result.success) {
                  // startNewHand already broadcasts via gameLoop.ts
                }
              } catch (err) {
                console.error('Auto-start hand error:', err);
              } finally {
                isStartingHand = false;
              }
            }
          }

          // ── Auto-fold timeout ──
          if (table.currentHandId) {
            const hand = await db!
              .select()
              .from(pokerGameHands)
              .where(eq(pokerGameHands.id, table.currentHandId))
              .limit(1)
              .then((rows: any) => rows[0] ?? null);

            if (hand && hand.currentSeat !== null && hand.turnStartedAt) {
              const elapsed = (Date.now() - new Date(hand.turnStartedAt).getTime()) / 1000;

              if (elapsed >= TURN_TIMEOUT_SECONDS && !isProcessingTimeout) {
                isProcessingTimeout = true;
                try {
                  const lockResult = await db!.execute(
                    sql`SELECT pg_try_advisory_lock(hashtext(${hand.id}::text)) as locked`
                  );
                  const locked = (lockResult as any)?.[0]?.locked;

                  if (locked) {
                    try {
                      const freshHand = await db!
                        .select()
                        .from(pokerGameHands)
                        .where(eq(pokerGameHands.id, hand.id))
                        .limit(1)
                        .then((rows: any) => rows[0] ?? null);

                      if (
                        freshHand &&
                        freshHand.status !== 'complete' &&
                        freshHand.currentSeat === hand.currentSeat &&
                        freshHand.turnStartedAt &&
                        (Date.now() - new Date(freshHand.turnStartedAt).getTime()) / 1000 >= TURN_TIMEOUT_SECONDS
                      ) {
                        const [timedOutSeat] = await db!
                          .select({ userId: pokerTableSeats.userId })
                          .from(pokerTableSeats)
                          .where(
                            and(
                              eq(pokerTableSeats.tableId, tableId),
                              eq(pokerTableSeats.seatNumber, freshHand.currentSeat)
                            )
                          )
                          .limit(1);

                        if (timedOutSeat) {
                          await processAction(tableId, timedOutSeat.userId, 'fold');
                          // processAction already broadcasts via gameLoop.ts
                        }
                      }
                    } finally {
                      await db!.execute(
                        sql`SELECT pg_advisory_unlock(hashtext(${hand.id}::text))`
                      );
                    }
                  }
                } catch (err) {
                  console.error('Auto-fold timeout error:', err);
                } finally {
                  isProcessingTimeout = false;
                }
              }
            }
          }

          scheduleWatchdog();
        } catch (error) {
          console.error('Watchdog error:', error);
          scheduleWatchdog();
        }
      }

      function scheduleWatchdog() {
        if (stopped) return;
        watchdogTimer = setTimeout(watchdog, WATCHDOG_INTERVAL);
      }

      // Start first watchdog cycle
      scheduleWatchdog();

      // Cleanup on disconnect
      request.signal.addEventListener('abort', () => {
        stopped = true;
        if (watchdogTimer) clearTimeout(watchdogTimer);
        if (keepaliveTimer) clearInterval(keepaliveTimer);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

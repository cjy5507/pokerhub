import { createAdminClient } from '@/lib/supabase/admin';

export type PokerEvent =
  | 'action'
  | 'hand_start'
  | 'hand_complete'
  | 'player_join'
  | 'player_leave'
  | 'table_closed';

export async function broadcastTableUpdate(tableId: string, event: PokerEvent) {
  try {
    const supabase = createAdminClient();
    const channel = supabase.channel(`poker:${tableId}`);

    await channel.send({
      type: 'broadcast',
      event: 'state_changed',
      payload: { event, timestamp: Date.now() },
    });

    await supabase.removeChannel(channel);
  } catch (err) {
    console.error('Broadcast error:', err);
    // Non-fatal: clients will still get updates via SSE watchdog fallback
  }
}

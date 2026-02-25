import { createOptionalAdminClient } from '@/lib/supabase/admin';
import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';

const SUBSCRIBE_TIMEOUT_MS = 2000;
const cachedChannels = new Map<string, Promise<{ supabase: SupabaseClient; channel: RealtimeChannel } | null>>();

async function subscribeChannel(channel: RealtimeChannel): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
        const timeout = setTimeout(() => resolve(false), SUBSCRIBE_TIMEOUT_MS);
        channel.subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                clearTimeout(timeout);
                resolve(true);
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
                clearTimeout(timeout);
                resolve(false);
            }
        });
    });
}

async function getOrCreateChannel(tableId: string) {
    const cached = cachedChannels.get(tableId);
    if (cached) return cached;

    const pendingChannel = (async () => {
        const supabase = createOptionalAdminClient();
        if (!supabase) return null;

        const channel = supabase.channel(`baccarat:${tableId}`);
        const subscribed = await subscribeChannel(channel);
        if (!subscribed) {
            await supabase.removeChannel(channel);
            return null;
        }

        return { supabase, channel };
    })();

    cachedChannels.set(tableId, pendingChannel);

    try {
        const connected = await pendingChannel;
        if (!connected) cachedChannels.delete(tableId);
        return connected;
    } catch (error) {
        cachedChannels.delete(tableId);
        throw error;
    }
}

async function releaseChannel(tableId: string) {
    const cached = cachedChannels.get(tableId);
    if (!cached) return;
    cachedChannels.delete(tableId);

    const connected = await cached.catch(() => null);
    if (!connected) return;

    await connected.supabase.removeChannel(connected.channel);
}

export async function broadcastBaccaratState(tableId: string, payload: any) {
    try {
        let connected = await getOrCreateChannel(tableId);
        if (!connected) return;

        let sendStatus = await connected.channel.send({
            type: 'broadcast',
            event: 'game_state',
            payload,
        });

        if (sendStatus === 'ok') return;

        await releaseChannel(tableId);
        connected = await getOrCreateChannel(tableId);
        if (!connected) return;

        sendStatus = await connected.channel.send({
            type: 'broadcast',
            event: 'game_state',
            payload,
        });

        if (sendStatus !== 'ok') {
            await releaseChannel(tableId);
        }
    } catch (err) {
        console.error('Baccarat Broadcast error:', err);
    }
}

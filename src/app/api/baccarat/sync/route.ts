import { syncBaccaratState } from '@/app/(games)/baccarat/actions';
import { NextRequest, NextResponse } from 'next/server';

const DEFAULT_BACCARAT_TABLE_ID = 'vip-room';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const tableId = searchParams.get('tableId') ?? DEFAULT_BACCARAT_TABLE_ID;

    try {
        const state = await syncBaccaratState(tableId);
        return NextResponse.json({ success: true, state, tableId });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'sync failed';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

import { syncBaccaratState } from '@/app/(games)/baccarat/actions';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const tableId = searchParams.get('tableId');

    if (!tableId) {
        return NextResponse.json({ error: 'tableId is required' }, { status: 400 });
    }

    try {
        const state = await syncBaccaratState(tableId);
        return NextResponse.json({ success: true, state });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

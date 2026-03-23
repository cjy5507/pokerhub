import { syncSnailRaceState } from '@/app/(games)/snail-race/actions';
import { NextRequest, NextResponse } from 'next/server';

const DEFAULT_SNAIL_TABLE_ID = 'main';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const tableId = searchParams.get('tableId') ?? DEFAULT_SNAIL_TABLE_ID;

  try {
    const state = await syncSnailRaceState(tableId);
    return NextResponse.json({ success: true, state, tableId });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'sync failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { syncBaccaratState } from '@/app/(games)/baccarat/actions';
import { syncSnailRaceState } from '@/app/(games)/snail-race/actions';
import { NextResponse } from 'next/server';

const BACCARAT_TABLE_ID = 'vip-room';
const SNAIL_RACE_TABLE_ID = 'main';

export async function GET() {
  const startedAt = Date.now();
  const results = {
    baccarat: { ok: false as boolean, error: null as string | null },
    snailRace: { ok: false as boolean, error: null as string | null },
  };

  try {
    await syncBaccaratState(BACCARAT_TABLE_ID);
    results.baccarat.ok = true;
  } catch (error: unknown) {
    results.baccarat.error = error instanceof Error ? error.message : 'baccarat tick failed';
  }

  try {
    await syncSnailRaceState(SNAIL_RACE_TABLE_ID);
    results.snailRace.ok = true;
  } catch (error: unknown) {
    results.snailRace.error = error instanceof Error ? error.message : 'snail-race tick failed';
  }

  const status =
    results.baccarat.ok && results.snailRace.ok
      ? 200
      : results.baccarat.ok || results.snailRace.ok
      ? 207
      : 500;

  return NextResponse.json(
    {
      success: status === 200,
      status,
      tookMs: Date.now() - startedAt,
      results,
    },
    { status },
  );
}

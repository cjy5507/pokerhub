import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
  const start = Date.now();

  try {
    if (!db) {
      return NextResponse.json(
        { status: 'error', error: 'Database not configured' },
        { status: 503 }
      );
    }

    // Check DB connectivity
    await db.execute(sql`SELECT 1`);

    return NextResponse.json({
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      db: 'connected',
      latency: Date.now() - start,
    });
  } catch (error) {
    return NextResponse.json(
      { status: 'error', error: 'Database connection failed', latency: Date.now() - start },
      { status: 503 }
    );
  }
}

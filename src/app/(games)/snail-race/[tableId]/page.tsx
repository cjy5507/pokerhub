import { getSession } from '@/lib/auth/session';
import { SnailRaceClient } from './SnailRaceClient';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export default async function SnailRacePage({ params }: { params: Promise<{ tableId: string }> }) {
  const session = await getSession();
  const { tableId } = await params;

  let initialBalance = 0;
  if (session?.userId) {
    const [u] = await db.select({ points: users.points }).from(users).where(eq(users.id, session.userId)).limit(1);
    if (u) initialBalance = u.points;
  }

  return (
    <SnailRaceClient
      tableId={tableId}
      userId={session?.userId ?? null}
      initialBalance={initialBalance}
    />
  );
}

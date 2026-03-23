import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { SnailRaceClient } from './[tableId]/SnailRaceClient';

export const dynamic = 'force-dynamic';

const DEFAULT_SNAIL_RACE_TABLE_ID = 'main';

export default async function SnailRaceIndexPage() {
  const session = await getSession().catch((error) => {
    console.error('SnailRaceIndexPage session error:', error);
    return null;
  });

  let initialBalance = 0;
  try {
    if (session?.userId) {
      const [u] = await db
        .select({ points: users.points })
        .from(users)
        .where(eq(users.id, session.userId))
        .limit(1);
      if (u) initialBalance = u.points;
    }
  } catch (error) {
    console.error('SnailRaceIndexPage DB error:', error);
  }

  return (
    <SnailRaceClient
      tableId={DEFAULT_SNAIL_RACE_TABLE_ID}
      userId={session?.userId ?? null}
      initialBalance={initialBalance}
    />
  );
}

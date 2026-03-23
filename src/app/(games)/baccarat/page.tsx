import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { BaccaratTableClient } from './[tableId]/BaccaratTableClient';

export const dynamic = 'force-dynamic';

const DEFAULT_BACCARAT_TABLE_ID = 'vip-room';

export default async function BaccaratIndexPage() {
  const session = await getSession().catch((error) => {
    console.error('BaccaratIndexPage session error:', error);
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
    console.error('BaccaratIndexPage DB error:', error);
  }

  return (
    <BaccaratTableClient
      tableId={DEFAULT_BACCARAT_TABLE_ID}
      userId={session?.userId ?? null}
      nickname={session?.nickname ?? null}
      initialBalance={initialBalance}
    />
  );
}

import { getTableState } from '../actions';
import { getSession } from '@/lib/auth/session';
import { PokerTableClient } from './PokerTableClient';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function PokerTablePage({ params }: { params: Promise<{ tableId: string }> }) {
  const session = await getSession();
  const { tableId } = await params;
  const initialState = await getTableState(tableId);

  if (!initialState) {
    redirect('/poker');
  }

  return (
    <PokerTableClient
      tableId={tableId}
      initialState={initialState}
      userId={session?.userId ?? null}
      nickname={session?.nickname ?? null}
    />
  );
}

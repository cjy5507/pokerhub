import { getSession } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { getPointHistory, getPointBalance } from '@/lib/gamification/points';
import { PointsHistoryClient } from './PointsHistoryClient';

export default async function PointsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await getSession();

  if (!session?.userId) {
    redirect('/login');
  }

  const { page: pageParam } = await searchParams;
  const page = parseInt(pageParam || '1', 10);
  const limit = 20;

  const [balance, history] = await Promise.all([
    getPointBalance(session.userId),
    getPointHistory(session.userId, page, limit),
  ]);

  return (
    <PointsHistoryClient
      balance={balance}
      transactions={history.transactions}
      pagination={history.pagination}
    />
  );
}

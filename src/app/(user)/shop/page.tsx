import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { getShopData } from './actions';
import ShopClient from './ShopClient';

export const metadata = {
  title: '포인트 샵 | Open Poker',
  description: '포인트로 뱃지, 칭호, 아바타 꾸미기, 게임칩 등을 구매하세요',
};

export default async function ShopPage() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const result = await getShopData();

  const badges = result.data?.badges ?? [];
  const points = result.data?.points ?? 0;
  const customTitle = result.data?.customTitle ?? null;

  return (
    <ShopClient
      initialBadges={badges}
      initialPoints={points}
      initialTitle={customTitle}
    />
  );
}

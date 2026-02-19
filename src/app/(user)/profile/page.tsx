import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: '프로필 | Open Poker',
  description: '오픈포커 사용자 프로필 페이지.',
};
import { getSession } from '@/lib/auth/session';

export default async function ProfileRedirectPage() {
  const session = await getSession();

  if (!session?.userId) {
    redirect('/login?redirect=/profile');
  }

  redirect(`/profile/${session.userId}`);
}

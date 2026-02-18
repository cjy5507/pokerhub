import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import SettingsClient from './SettingsClient';

export const metadata = {
  title: '설정 - PokerHub',
};

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) {
    redirect('/login?redirect=%2Fsettings');
  }

  return <SettingsClient />;
}

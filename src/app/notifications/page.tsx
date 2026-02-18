import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { getNotifications } from './actions';
import NotificationsClient from './NotificationsClient';

export default async function NotificationsPage() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const { notifications, hasMore, unreadCount } = await getNotifications(1, 20);

  return (
    <NotificationsClient
      initialNotifications={notifications}
      initialHasMore={hasMore}
      initialUnreadCount={unreadCount}
    />
  );
}

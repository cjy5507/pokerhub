import { getNotifications } from './actions';
import NotificationsClient from './NotificationsClient';

export default async function NotificationsPage() {
  const { notifications, hasMore, unreadCount } = await getNotifications(1, 20);

  return (
    <NotificationsClient
      initialNotifications={notifications}
      initialHasMore={hasMore}
      initialUnreadCount={unreadCount}
    />
  );
}

import { getNotifications } from './actions';
import { formatDistanceToNow } from 'date-fns';

function getNotificationIcon(type: string) {
  const baseClass = "w-5 h-5 flex items-center justify-center rounded-full text-xs font-bold";
  switch (type) {
    case 'comment':
      return <div className={`${baseClass} bg-blue-400 text-white`}>💬</div>;
    case 'like':
      return <div className={`${baseClass} bg-red-400 text-white`}>❤️</div>;
    case 'follow':
      return <div className={`${baseClass} bg-green-400 text-white`}>👤</div>;
    case 'mention':
      return <div className={`${baseClass} bg-purple-400 text-white`}>@</div>;
    case 'badge':
      return <div className={`${baseClass} bg-[#c9a227] text-white`}>🏆</div>;
    case 'level_up':
      return <div className={`${baseClass} bg-[#c9a227] text-white`}>📈</div>;
    case 'system':
      return <div className={`${baseClass} bg-gray-400 text-white`}>ℹ️</div>;
    default:
      return <div className={`${baseClass} bg-gray-400 text-white`}>🔔</div>;
  }
}

export default async function NotificationsPage() {
  const { notifications, hasMore, unreadCount } = await getNotifications(1, 20);

  return (
    <div className="min-h-screen bg-[#121212] text-[#e0e0e0]">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#c9a227] mb-2">Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-[#a0a0a0]">
              You have <span className="text-[#c9a227] font-semibold">{unreadCount}</span> unread notification{unreadCount !== 1 && 's'}
            </p>
          )}
        </div>

        {/* Notifications List */}
        {notifications.length === 0 ? (
          <div className="bg-[#1e1e1e] border border-[#333] rounded-lg p-12 text-center">
            <div className="text-6xl text-[#a0a0a0] mx-auto mb-4">🔔</div>
            <p className="text-[#a0a0a0] text-lg">No notifications yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((notification) => {
              const NotificationWrapper = notification.link ? 'a' : 'div';
              const wrapperProps = notification.link
                ? { href: notification.link, className: 'block' }
                : { className: 'block' };

              return (
                <NotificationWrapper key={notification.id} {...wrapperProps}>
                  <div
                    className={`bg-[#1e1e1e] border border-[#333] rounded-lg p-4 transition-all hover:bg-[#252525] ${
                      notification.link ? 'cursor-pointer' : ''
                    } ${!notification.isRead ? 'border-l-4 border-l-[#c9a227]' : ''}`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <h3 className={`font-medium ${!notification.isRead ? 'text-[#e0e0e0]' : 'text-[#a0a0a0]'}`}>
                              {notification.title}
                            </h3>
                            {notification.body && (
                              <p className="text-sm text-[#a0a0a0] mt-1 line-clamp-2">
                                {notification.body}
                              </p>
                            )}
                            <div className="flex items-center gap-3 mt-2">
                              {notification.actor && (
                                <div className="flex items-center gap-2">
                                  {notification.actor.avatarUrl ? (
                                    <img
                                      src={notification.actor.avatarUrl}
                                      alt={notification.actor.nickname}
                                      className="w-5 h-5 rounded-full"
                                    />
                                  ) : (
                                    <div className="w-5 h-5 rounded-full bg-[#333] flex items-center justify-center text-xs">
                                      {notification.actor.nickname[0].toUpperCase()}
                                    </div>
                                  )}
                                  <span className="text-sm text-[#a0a0a0]">
                                    {notification.actor.nickname}
                                  </span>
                                </div>
                              )}
                              <span className="text-sm text-[#888]">
                                {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                              </span>
                            </div>
                          </div>

                          {/* Unread indicator */}
                          {!notification.isRead && (
                            <div className="flex-shrink-0">
                              <div className="w-2 h-2 rounded-full bg-[#c9a227]" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </NotificationWrapper>
              );
            })}
          </div>
        )}

        {/* Load More */}
        {hasMore && (
          <div className="mt-6 text-center">
            <button className="px-6 py-2 bg-[#1e1e1e] border border-[#333] rounded-lg text-[#c9a227] hover:bg-[#252525] transition-colors">
              Load More
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { getNotifications, markAsRead, markAllAsRead, deleteNotification } from './actions';
import { Trash2 } from 'lucide-react';

interface NotificationData {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  isRead: boolean;
  actor: {
    id: string;
    nickname: string;
    avatarUrl: string | null;
  } | null;
  createdAt: string;
}

interface NotificationsClientProps {
  initialNotifications: NotificationData[];
  initialHasMore: boolean;
  initialUnreadCount: number;
}

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
      return <div className={`${baseClass} bg-ph-gold text-white`}>🏆</div>;
    case 'level_up':
      return <div className={`${baseClass} bg-ph-gold text-white`}>📈</div>;
    case 'system':
      return <div className={`${baseClass} bg-gray-400 text-white`}>ℹ️</div>;
    default:
      return <div className={`${baseClass} bg-gray-400 text-white`}>🔔</div>;
  }
}

export default function NotificationsClient({
  initialNotifications,
  initialHasMore,
  initialUnreadCount,
}: NotificationsClientProps) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationData[]>(initialNotifications);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [page, setPage] = useState(1);
  const [isPending, startTransition] = useTransition();
  const [loadingMore, setLoadingMore] = useState(false);

  const handleMarkAllAsRead = () => {
    startTransition(async () => {
      await markAllAsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true }))
      );
      setUnreadCount(0);
    });
  };

  const handleNotificationClick = async (notification: NotificationData) => {
    if (!notification.isRead) {
      await markAsRead(notification.id);
      setNotifications((prev) =>
        prev.map((n) => n.id === notification.id ? { ...n, isRead: true } : n)
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
    if (notification.link) {
      router.push(notification.link);
    }
  };

  const handleDelete = async (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    const target = notifications.find((n) => n.id === notificationId);
    await deleteNotification(notificationId);
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    if (target && !target.isRead) {
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
  };

  const handleLoadMore = async () => {
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const result = await getNotifications(nextPage, 20);
      setNotifications((prev) => [...prev, ...result.notifications]);
      setHasMore(result.hasMore);
      setPage(nextPage);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div className="min-h-screen bg-ph-bg text-ph-text">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-ph-gold mb-2">Notifications</h1>
            {unreadCount > 0 && (
              <p className="text-ph-text-secondary">
                You have <span className="text-ph-gold font-semibold">{unreadCount}</span> unread notification{unreadCount !== 1 && 's'}
              </p>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              disabled={isPending}
              className="px-4 py-2 bg-ph-surface border border-ph-border rounded-lg text-ph-gold hover:bg-ph-elevated transition-colors text-sm disabled:opacity-50"
            >
              {isPending ? '처리 중...' : '모두 읽음'}
            </button>
          )}
        </div>

        {/* Notifications List */}
        {notifications.length === 0 ? (
          <div className="bg-ph-surface border border-ph-border rounded-lg p-12 text-center">
            <div className="text-6xl text-ph-text-secondary mx-auto mb-4">🔔</div>
            <p className="text-ph-text-secondary text-lg">No notifications yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`bg-ph-surface border border-ph-border rounded-lg p-4 transition-all hover:bg-ph-elevated cursor-pointer ${
                  !notification.isRead ? 'border-l-4 border-l-ph-gold' : ''
                }`}
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
                        <h3 className={`font-medium ${!notification.isRead ? 'text-ph-text' : 'text-ph-text-secondary'}`}>
                          {notification.title}
                        </h3>
                        {notification.body && (
                          <p className="text-sm text-ph-text-secondary mt-1 line-clamp-2">
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
                                <div className="w-5 h-5 rounded-full bg-ph-border flex items-center justify-center text-xs">
                                  {notification.actor.nickname[0].toUpperCase()}
                                </div>
                              )}
                              <span className="text-sm text-ph-text-secondary">
                                {notification.actor.nickname}
                              </span>
                            </div>
                          )}
                          <span className="text-sm text-ph-text-muted">
                            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Delete button */}
                        <button
                          onClick={(e) => handleDelete(e, notification.id)}
                          className="p-1.5 rounded-md text-ph-text-dim hover:text-red-400 hover:bg-ph-border transition-colors"
                          aria-label="삭제"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                        {/* Unread indicator */}
                        {!notification.isRead && (
                          <div className="w-2 h-2 rounded-full bg-ph-gold" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Load More */}
        {hasMore && (
          <div className="mt-6 text-center">
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="px-6 py-2 bg-ph-surface border border-ph-border rounded-lg text-ph-gold hover:bg-ph-elevated transition-colors disabled:opacity-50"
            >
              {loadingMore ? '불러오는 중...' : 'Load More'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

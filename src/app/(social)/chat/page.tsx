import { getChatRooms } from './actions';
import { MessageSquare, Users, Lock } from 'lucide-react';
import Link from 'next/link';
import { formatRelativeTime } from '@/lib/utils/time';
import { cn } from '@/lib/utils';

export const metadata = {
  title: '채팅',
  description: '포커 커뮤니티 실시간 채팅',
};

const typeLabels = {
  general: '일반',
  game: '게임',
  tournament: '토너먼트',
  private: '비공개',
};

const typeColors = {
  general: 'bg-op-elevated text-op-text-secondary',
  game: 'bg-op-success-dim text-op-success',
  tournament: 'bg-purple-500/15 text-purple-400',
  private: 'bg-op-error-dim text-op-error',
};

export default async function ChatPage() {
  const { rooms } = await getChatRooms();

  return (
    <div className="min-h-screen bg-op-bg pb-20 lg:pb-8">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-op-text mb-2">채팅</h1>
          <p className="text-sm text-op-text-secondary">
            포커 애호가들과 실시간으로 소통하세요
          </p>
        </div>

        {/* Chat Rooms List */}
        <div className="space-y-3">
          {rooms.map((room) => (
            <Link
              key={room.id}
              href={`/chat/${room.id}`}
              className={cn(
                'block bg-op-surface border border-op-border rounded-lg p-4',
                'hover:bg-op-elevated transition-colors',
                'min-h-[88px]'
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {/* Room Name & Badge */}
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="w-5 h-5 text-op-gold flex-shrink-0" />
                    <h2 className="text-base font-semibold text-op-text truncate">
                      {room.nameKo}
                    </h2>
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded text-xs font-medium flex-shrink-0',
                        typeColors[room.type]
                      )}
                    >
                      {typeLabels[room.type]}
                    </span>
                  </div>

                  {/* Last Message */}
                  {room.lastMessage && (
                    <div className="mb-2">
                      <p className="text-sm text-op-text-secondary line-clamp-1">
                        <span className="font-medium text-op-gold">
                          {room.lastMessage.senderNickname}
                        </span>
                        : {room.lastMessage.content}
                      </p>
                    </div>
                  )}

                  {/* Footer Info */}
                  <div className="flex items-center gap-3 text-xs text-op-text-muted">
                    <div className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      <span>{room.participantCount}</span>
                    </div>
                    {room.minLevel > 1 && (
                      <div className="flex items-center gap-1">
                        <Lock className="w-3.5 h-3.5" />
                        <span>최소 레벨 {room.minLevel}</span>
                      </div>
                    )}
                    {room.lastMessage && (
                      <span>{formatRelativeTime(room.lastMessage.createdAt)}</span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Empty State */}
        {rooms.length === 0 && (
          <div className="text-center py-12">
            <MessageSquare className="w-12 h-12 text-op-border mx-auto mb-3" />
            <p className="text-op-text-muted">채팅방이 없습니다</p>
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';
import { Send, MessageSquare, Users } from 'lucide-react';
import { useChat } from './ChatProvider';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/utils/time';
import { useSession } from '@/components/providers/SessionProvider';

export default function ChatSidebarPanel() {
  const session = useSession();
  const {
    rooms,
    activeRoomId,
    messages,
    isLoading,
    isSending,
    setActiveRoom,
    sendMessage,
  } = useChat();

  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim() || isSending || !activeRoomId) return;

    const content = inputValue.trim();
    setInputValue('');
    try {
      await sendMessage(content);
    } catch {
      setInputValue(content);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const activeRoom = rooms.find((r) => r.id === activeRoomId);

  return (
    <div className="flex h-[500px] flex-col bg-[#1e1e1e] border border-[#333] rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#333]">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-[#c9a227]" />
          <h3 className="text-sm font-semibold text-[#c9a227]">실시간 채팅</h3>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs text-[#a0a0a0]">
            {activeRoom?.participantCount ?? 0}
          </span>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-2">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-xs text-[#a0a0a0]">
            메시지 로딩 중...
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-xs text-[#a0a0a0]">
            <MessageSquare className="w-8 h-8 mb-2 opacity-50" />
            <p>첫 메시지를 남겨보세요!</p>
          </div>
        ) : (
          <>
            {messages.map((message) => {
              const isOwn = message.sender.id === session?.userId;
              return (
                <div
                  key={message.id}
                  className={cn(
                    'flex gap-2',
                    isOwn ? 'flex-row-reverse' : 'flex-row'
                  )}
                >
                  {/* Avatar */}
                  {!isOwn && (
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#c9a227] flex items-center justify-center text-[#1e1e1e] text-[10px] font-bold">
                      {message.sender.nickname[0]}
                    </div>
                  )}

                  {/* Message Content */}
                  <div className={cn('flex flex-col max-w-[80%]', isOwn ? 'items-end' : 'items-start')}>
                    {!isOwn && (
                      <span className="text-[10px] text-[#c9a227] font-medium mb-0.5 px-1">
                        {message.sender.nickname}
                      </span>
                    )}
                    <div
                      className={cn(
                        'px-2.5 py-1.5 rounded-lg text-xs',
                        isOwn
                          ? 'bg-[#2a2a2a] text-[#e0e0e0]'
                          : 'bg-[#252525] text-[#e0e0e0]'
                      )}
                    >
                      <p className="whitespace-pre-wrap break-words">{message.content}</p>
                    </div>
                    <span className="text-[10px] text-[#888] mt-0.5 px-1">
                      {formatRelativeTime(message.createdAt)}
                    </span>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <div className="flex items-center gap-2 px-2 py-2 border-t border-[#333] bg-[#1a1a1a]">
        {session ? (
          <>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="메시지 입력..."
              disabled={isSending || !activeRoomId}
              className="flex-1 px-3 py-1.5 text-sm bg-[#2a2a2a] text-[#e0e0e0] placeholder:text-[#888] border border-[#333] rounded focus:outline-none focus:border-[#c9a227] disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || isSending || !activeRoomId}
              className="flex-shrink-0 p-1.5 bg-[#c9a227] text-[#1e1e1e] rounded hover:bg-[#d4af37] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="전송"
            >
              <Send className="w-4 h-4" />
            </button>
          </>
        ) : (
          <div className="flex-1 text-center py-2">
            <a href="/login" className="text-xs text-[#c9a227] hover:underline">
              로그인 후 채팅하기
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

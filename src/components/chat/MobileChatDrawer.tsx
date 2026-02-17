'use client';

import { useChat } from './ChatProvider';
import { useEffect, useRef, useState } from 'react';
import { X, Send, Users, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/utils/time';
import { useSession } from '@/components/providers/SessionProvider';

export function MobileChatDrawer() {
  const session = useSession();
  const {
    rooms,
    activeRoomId,
    messages,
    isSending,
    isMobileDrawerOpen,
    setActiveRoom,
    sendMessage,
    closeMobileDrawer,
  } = useChat();

  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const activeRoom = rooms.find(r => r.id === activeRoomId);

  // Body scroll lock
  useEffect(() => {
    if (isMobileDrawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileDrawerOpen]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim() || isSending) return;

    const content = inputValue.trim();
    setInputValue('');
    try {
      await sendMessage(content);
    } catch {
      setInputValue(content);
    }
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Overlay */}
      <div
        className={cn(
          'fixed inset-0 bg-black/60 z-50 transition-opacity duration-300',
          isMobileDrawerOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={closeMobileDrawer}
      />

      {/* Drawer Panel */}
      <div
        className={cn(
          'fixed inset-0 z-50 bg-[#121212] transition-transform duration-300 flex flex-col',
          isMobileDrawerOpen ? 'translate-y-0' : 'translate-y-full'
        )}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#1e1e1e] border-b border-[#333]">
          <button
            onClick={closeMobileDrawer}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center -ml-2 text-[#e0e0e0] hover:text-[#c9a227] transition-colors"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
          <h2 className="text-base font-bold text-[#e0e0e0]">채팅</h2>
          <div className="flex items-center gap-1.5">
            <Users className="w-4 h-4 text-[#c9a227]" />
            <span className="text-sm text-[#c9a227] font-medium">
              {activeRoom?.participantCount ?? 0}
            </span>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-[#808080]">
              <MessageSquare className="w-12 h-12 mb-2 opacity-30" />
              <p className="text-sm">아직 메시지가 없습니다</p>
              <p className="text-xs mt-1 text-[#888]">첫 메시지를 보내보세요!</p>
            </div>
          ) : (
            <>
              {messages.map(msg => {
                const isOwn = msg.sender.id === session?.userId;

                return (
                  <div
                    key={msg.id}
                    className={cn(
                      'flex gap-3',
                      isOwn ? 'flex-row-reverse' : 'flex-row'
                    )}
                  >
                    {/* Avatar */}
                    {!isOwn && (
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#c9a227] flex items-center justify-center text-sm font-bold text-black">
                        {msg.sender.nickname[0]}
                      </div>
                    )}

                    {/* Message Content */}
                    <div className={cn('flex flex-col', isOwn ? 'items-end' : 'items-start')}>
                      {!isOwn && (
                        <div className="flex items-center gap-2 mb-1 px-1">
                          <span className="text-xs font-medium text-[#e0e0e0]">
                            {msg.sender.nickname}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#2a2a2a] text-[#c9a227]">
                            Lv.{msg.sender.level}
                          </span>
                        </div>
                      )}

                      {/* Bubble */}
                      <div
                        className={cn(
                          'px-4 py-2.5 rounded-2xl max-w-[75%]',
                          isOwn
                            ? 'bg-[#2a2a2a] text-[#e0e0e0] rounded-br-sm'
                            : 'bg-[#1e1e1e] text-[#e0e0e0] rounded-bl-sm'
                        )}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words">
                          {msg.content}
                        </p>
                      </div>

                      {/* Timestamp */}
                      <span className="text-[10px] text-[#808080] mt-1 px-1">
                        {formatRelativeTime(msg.createdAt)}
                      </span>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input Bar */}
        <div
          className="px-4 py-3 border-t border-[#333] bg-[#1e1e1e]"
          style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }}
        >
          {session ? (
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="메시지를 입력하세요..."
                className={cn(
                  'flex-1 bg-[#2a2a2a] text-[#e0e0e0] placeholder:text-[#808080]',
                  'rounded-xl px-4 py-3 resize-none',
                  'border border-[#333] focus:outline-none focus:border-[#c9a227] focus:ring-1 focus:ring-[#c9a227]',
                  'min-h-[44px] max-h-[120px] text-sm'
                )}
                rows={1}
                maxLength={500}
                disabled={isSending}
              />
              <button
                onClick={handleSend}
                disabled={!inputValue.trim() || isSending}
                className={cn(
                  'flex-shrink-0 p-3 rounded-xl transition-colors',
                  inputValue.trim() && !isSending
                    ? 'bg-[#c9a227] hover:bg-[#d4af37] text-black'
                    : 'bg-[#333] text-[#808080] cursor-not-allowed'
                )}
                aria-label="전송"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div className="text-center py-3">
              <a href="/login" className="text-sm text-[#c9a227] hover:underline">
                로그인 후 채팅하기
              </a>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

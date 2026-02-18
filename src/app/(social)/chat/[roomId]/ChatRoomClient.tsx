'use client';

import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Send, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatRelativeTime } from '@/lib/utils/time';
import { cn } from '@/lib/utils';
import { sendChatMessage } from '../actions';
import type { ChatRoomData, ChatMessageData } from '../actions';
import { useSession } from '@/components/providers/SessionProvider';

interface ChatRoomClientProps {
  room: ChatRoomData;
  initialMessages: ChatMessageData[];
}

export default function ChatRoomClient({ room, initialMessages }: ChatRoomClientProps) {
  const router = useRouter();
  const session = useSession();
  const [messages, setMessages] = useState<ChatMessageData[]>(initialMessages);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sseRetry, setSseRetry] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // SSE: real-time message subscription
  useEffect(() => {
    const eventSource = new EventSource(`/api/chat/${room.id}`);
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    eventSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        if (parsed.type === 'message' && parsed.data) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === parsed.data.id)) return prev;
            return [...prev, parsed.data as ChatMessageData];
          });
        }
      } catch {
        // Ignore parse errors
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
      // Auto-reconnect after 3 seconds by bumping retry counter
      reconnectTimer = setTimeout(() => {
        setSseRetry((prev) => prev + 1);
      }, 3000);
    };

    return () => {
      eventSource.close();
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, [room.id, sseRetry]);

  const handleSendMessage = async () => {
    if (!input.trim() || isSending) return;

    const content = input.trim();
    setInput('');
    setIsSending(true);

    try {
      const result = await sendChatMessage(room.id, content);

      if (result.success && result.message) {
        setMessages((prev) => [...prev, result.message!]);
      } else {
        alert(result.error || '메시지 전송에 실패했습니다');
        setInput(content);
      }
    } catch (error) {
      console.error('Send message error:', error);
      alert('메시지 전송 중 오류가 발생했습니다');
      setInput(content);
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#121212]">
      {/* Header */}
      <div className="bg-[#1e1e1e] border-b border-[#333] px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center -ml-2 text-[#e0e0e0] hover:text-[#c9a227] transition-colors"
          aria-label="뒤로 가기"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex-1 min-w-0">
          <h1 className="text-base font-semibold text-[#e0e0e0] truncate">
            {room.nameKo}
          </h1>
          <div className="flex items-center gap-1 text-xs text-[#808080]">
            <Users className="w-3 h-3" />
            <span>{room.participantCount}명</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((message) => {
          const isOwn = message.sender.id === session?.userId;

          return (
            <div
              key={message.id}
              className={cn(
                'flex gap-3',
                isOwn ? 'flex-row-reverse' : 'flex-row'
              )}
            >
              {/* Avatar */}
              {!isOwn && (
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#c9a227] flex items-center justify-center text-sm font-bold text-black">
                  {message.sender.nickname[0]}
                </div>
              )}

              {/* Message Content */}
              <div className={cn('flex flex-col', isOwn ? 'items-end' : 'items-start')}>
                {/* Sender Info (for other users) */}
                {!isOwn && (
                  <div className="flex items-center gap-2 mb-1 px-3">
                    <span className="text-sm font-medium text-[#e0e0e0]">
                      {message.sender.nickname}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-[#2a2a2a] text-[#c9a227]">
                      Lv.{message.sender.level}
                    </span>
                  </div>
                )}

                {/* Message Bubble */}
                <div
                  className={cn(
                    'max-w-[75%] sm:max-w-md rounded-2xl px-4 py-2.5',
                    isOwn
                      ? 'bg-[#2a2a2a] text-[#e0e0e0]'
                      : 'bg-[#1e1e1e] text-[#e0e0e0]'
                  )}
                >
                  <p className="text-sm whitespace-pre-wrap break-words">
                    {message.content}
                  </p>
                </div>

                {/* Timestamp */}
                <div className={cn('mt-1 px-3', isOwn ? 'text-right' : 'text-left')}>
                  <span className="text-xs text-[#808080]">
                    {formatRelativeTime(message.createdAt)}
                  </span>
                </div>
              </div>

              {/* Own Avatar Placeholder */}
              {isOwn && <div className="w-10" />}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="bg-[#1e1e1e] border-t border-[#333] px-4 py-3">
        {session ? (
          <>
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="메시지를 입력하세요..."
                className={cn(
                  'flex-1 bg-[#2a2a2a] text-[#e0e0e0] rounded-lg px-4 py-3',
                  'placeholder:text-[#808080] border border-[#333]',
                  'focus:outline-none focus:border-[#c9a227] focus:ring-1 focus:ring-[#c9a227]',
                  'resize-none min-h-[44px] max-h-32',
                  'text-sm'
                )}
                rows={1}
                maxLength={500}
                disabled={isSending}
              />
              <button
                onClick={handleSendMessage}
                disabled={!input.trim() || isSending}
                className={cn(
                  'flex-shrink-0 w-11 h-11 rounded-lg flex items-center justify-center',
                  'transition-colors',
                  input.trim() && !isSending
                    ? 'bg-[#c9a227] hover:bg-[#d4af37] text-black'
                    : 'bg-[#333] text-[#808080] cursor-not-allowed'
                )}
                aria-label="전송"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
            <div className="mt-1 text-xs text-[#808080] text-right">
              {input.length}/500
            </div>
          </>
        ) : (
          <div className="text-center py-3">
            <a href="/login" className="text-sm text-[#c9a227] hover:underline">
              로그인 후 채팅하기
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

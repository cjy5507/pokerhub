'use client';

import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { ArrowLeft, Send, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatRelativeTime } from '@/lib/utils/time';
import { cn } from '@/lib/utils';
import { sendChatMessage, getChatMessages } from '../actions';
import type { ChatRoomData, ChatMessageData } from '../actions';
import { useSession } from '@/components/providers/SessionProvider';
import { createOptionalClient } from '@/lib/supabase/client';

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
  const [sendError, setSendError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(initialMessages.length >= 20);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const nextCursorRef = useRef<string | undefined>(
    initialMessages.length > 0 ? initialMessages[0].createdAt : undefined
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const scrollHeightBeforeRef = useRef(0);
  const needsScrollCorrectionRef = useRef(false);
  const senderCacheRef = useRef<Map<string, { nickname: string; avatarUrl: string | null; level: number }>>(new Map());

  // Keep sender cache in sync for Realtime message construction
  useEffect(() => {
    messages.forEach(msg => {
      if (!senderCacheRef.current.has(msg.sender.id)) {
        senderCacheRef.current.set(msg.sender.id, {
          nickname: msg.sender.nickname,
          avatarUrl: msg.sender.avatarUrl,
          level: msg.sender.level,
        });
      }
    });
  }, [messages]);

  const loadMore = async () => {
    if (isLoadingMore || !hasMore || !nextCursorRef.current) return;
    const container = scrollContainerRef.current;
    scrollHeightBeforeRef.current = container?.scrollHeight ?? 0;
    needsScrollCorrectionRef.current = true;
    setIsLoadingMore(true);
    try {
      const result = await getChatMessages(room.id, nextCursorRef.current);
      if (result.messages && result.messages.length > 0) {
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const older = result.messages.filter((m) => !existingIds.has(m.id));
          return [...older, ...prev];
        });
      }
      nextCursorRef.current = result.nextCursor;
      setHasMore(result.hasMore ?? false);
    } catch (error) {
      console.error('Failed to load older messages:', error);
      needsScrollCorrectionRef.current = false;
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Restore scroll position after prepending older messages
  useLayoutEffect(() => {
    if (needsScrollCorrectionRef.current && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop +=
        scrollContainerRef.current.scrollHeight - scrollHeightBeforeRef.current;
      needsScrollCorrectionRef.current = false;
    }
  }, [messages]);

  // IntersectionObserver: load older messages when top sentinel enters viewport
  useEffect(() => {
    const sentinel = topSentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { threshold: 0.1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, isLoadingMore]);

  // Scroll to bottom on new messages (skip when prepending older ones)
  useEffect(() => {
    if (needsScrollCorrectionRef.current) return;
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // SSE: real-time message subscription (fallback when NEXT_PUBLIC_CHAT_USE_REALTIME is not set)
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_CHAT_USE_REALTIME === 'true') return;
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

  // Supabase Realtime subscription (active when NEXT_PUBLIC_CHAT_USE_REALTIME=true)
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_CHAT_USE_REALTIME !== 'true') return;

    const supabase = createOptionalClient();
    if (!supabase) return;

    const channel = supabase
      .channel(`chat-room:${room.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${room.id}` },
        (payload) => {
          const row = payload.new as { id: string; content: string; sender_id: string; created_at: string };
          if (!row?.id) return;

          const cachedSender = senderCacheRef.current.get(row.sender_id);
          const newMessage: ChatMessageData = {
            id: row.id,
            content: row.content,
            createdAt: row.created_at,
            sender: cachedSender
              ? { id: row.sender_id, ...cachedSender }
              : { id: row.sender_id, nickname: '...', avatarUrl: null, level: 1 },
          };

          setMessages((prev) => {
            if (prev.some((m) => m.id === newMessage.id)) return prev;
            return [...prev, newMessage];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [room.id]);

  const handleSendMessage = async () => {
    if (!input.trim() || isSending) return;

    const content = input.trim();
    setInput('');
    setIsSending(true);

    try {
      const result = await sendChatMessage(room.id, content);

      if (result.success && result.message) {
        setMessages((prev) => [...prev, result.message!]);
        setSendError(null);
      } else {
        setSendError(result.error || '메시지 전송에 실패했습니다');
        setInput(content);
      }
    } catch (error) {
      console.error('Send message error:', error);
      setSendError('메시지 전송 중 오류가 발생했습니다');
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
    <div className="flex flex-col h-screen bg-op-bg">
      {/* Header */}
      <div className="bg-op-surface border-b border-op-border px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center -ml-2 text-op-text hover:text-op-gold transition-colors"
          aria-label="뒤로 가기"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex-1 min-w-0">
          <h1 className="text-base font-semibold text-op-text truncate">
            {room.nameKo}
          </h1>
          <div className="flex items-center gap-1 text-xs text-op-text-muted">
            <Users className="w-3 h-3" />
            <span>{room.participantCount}명</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Top sentinel for infinite scroll */}
        <div ref={topSentinelRef} className="h-1" />
        {isLoadingMore && (
          <div className="text-center py-2 text-xs text-op-text-muted">이전 메시지 불러오는 중...</div>
        )}
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
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-op-gold flex items-center justify-center text-sm font-bold text-black">
                  {message.sender.nickname[0]}
                </div>
              )}

              {/* Message Content */}
              <div className={cn('flex flex-col', isOwn ? 'items-end' : 'items-start')}>
                {/* Sender Info (for other users) */}
                {!isOwn && (
                  <div className="flex items-center gap-2 mb-1 px-3">
                    <span className="text-sm font-medium text-op-text">
                      {message.sender.nickname}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-op-elevated text-op-gold">
                      Lv.{message.sender.level}
                    </span>
                  </div>
                )}

                {/* Message Bubble */}
                <div
                  className={cn(
                    'max-w-[75%] sm:max-w-md rounded-2xl px-4 py-2.5',
                    isOwn
                      ? 'bg-op-elevated text-op-text'
                      : 'bg-op-surface text-op-text'
                  )}
                >
                  <p className="text-sm whitespace-pre-wrap break-words">
                    {message.content}
                  </p>
                </div>

                {/* Timestamp */}
                <div className={cn('mt-1 px-3', isOwn ? 'text-right' : 'text-left')}>
                  <span className="text-xs text-op-text-muted">
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
      <div className="bg-op-surface border-t border-op-border px-4 py-3">
        {sendError && (
          <p className="text-sm text-red-400 text-center mb-2">{sendError}</p>
        )}
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
                  'flex-1 bg-op-elevated text-op-text rounded-lg px-4 py-3',
                  'placeholder:text-op-text-muted border border-op-border',
                  'focus:outline-none focus:border-op-gold focus:ring-1 focus:ring-op-gold',
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
                    ? 'bg-op-gold hover:bg-op-gold-hover text-black'
                    : 'bg-op-border text-op-text-muted cursor-not-allowed'
                )}
                aria-label="전송"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
            <div className="mt-1 text-xs text-op-text-muted text-right">
              {input.length}/500
            </div>
          </>
        ) : (
          <div className="text-center py-3">
            <a href="/login" className="text-sm text-op-gold hover:underline">
              로그인 후 채팅하기
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

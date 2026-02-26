'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { ChatRoomData, ChatMessageData } from '@/app/(social)/chat/actions';
import { getChatRooms, getChatMessages, sendChatMessage } from '@/app/(social)/chat/actions';
import { createOptionalClient } from '@/lib/supabase/client';

interface ChatContextValue {
  rooms: ChatRoomData[];
  activeRoomId: string | null;
  messages: ChatMessageData[];
  isMobileDrawerOpen: boolean;
  isLoading: boolean;
  isSending: boolean;
  hasMoreMessages: boolean;
  isLoadingMore: boolean;
  setActiveRoom: (roomId: string) => void;
  openMobileDrawer: () => void;
  closeMobileDrawer: () => void;
  sendMessage: (content: string) => Promise<void>;
  refreshRooms: () => Promise<void>;
  loadMoreMessages: () => Promise<void>;
}

const ChatContext = createContext<ChatContextValue | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [rooms, setRooms] = useState<ChatRoomData[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const nextCursorRef = useRef<string | undefined>(undefined);
  const switchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshRooms = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getChatRooms();
      if (result.rooms) {
        setRooms(result.rooms);
      }
    } catch (error) {
      console.error('Failed to fetch chat rooms:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const setActiveRoom = useCallback((roomId: string) => {
    if (switchTimerRef.current) clearTimeout(switchTimerRef.current);
    switchTimerRef.current = setTimeout(() => {
      setActiveRoomId(roomId);
      switchTimerRef.current = null;
    }, 100);
  }, []);

  const loadMoreMessages = useCallback(async () => {
    if (!activeRoomId || isLoadingMore || !hasMoreMessages) return;
    setIsLoadingMore(true);
    try {
      const result = await getChatMessages(activeRoomId, nextCursorRef.current);
      if (result.messages && result.messages.length > 0) {
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const older = result.messages.filter((m) => !existingIds.has(m.id));
          return [...older, ...prev];
        });
      }
      nextCursorRef.current = result.nextCursor;
      setHasMoreMessages(result.hasMore ?? false);
    } catch (error) {
      console.error('Failed to load more messages:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [activeRoomId, isLoadingMore, hasMoreMessages]);

  const openMobileDrawer = useCallback(() => {
    setIsMobileDrawerOpen(true);
  }, []);

  const closeMobileDrawer = useCallback(() => {
    setIsMobileDrawerOpen(false);
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    if (!activeRoomId || !content.trim()) return;

    setIsSending(true);
    try {
      const sendResult = await sendChatMessage(activeRoomId, content);

      if (sendResult.success && sendResult.message) {
        setMessages(prev => {
          if (prev.some(m => m.id === sendResult.message!.id)) return prev;
          return [...prev, sendResult.message!];
        });
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    } finally {
      setIsSending(false);
    }
  }, [activeRoomId]);

  // Fetch rooms on mount
  useEffect(() => {
    refreshRooms();
  }, [refreshRooms]);

  // Auto-select first room when rooms load
  useEffect(() => {
    if (rooms.length > 0 && !activeRoomId) {
      setActiveRoomId(rooms[0].id);
    }
  }, [rooms, activeRoomId]);

  // Subscribe to messages via Supabase Realtime or fall back to 5s polling
  useEffect(() => {
    if (!activeRoomId) {
      setMessages([]);
      return;
    }

    let isMounted = true;
    nextCursorRef.current = undefined;
    setHasMoreMessages(false);

    const fetchMessages = async (showLoading = true) => {
      if (showLoading) setIsLoading(true);
      try {
        const result = await getChatMessages(activeRoomId);
        if (isMounted && result.messages) {
          setMessages(result.messages);
          nextCursorRef.current = result.nextCursor;
          setHasMoreMessages(result.hasMore ?? false);
        }
      } catch (error) {
        console.error('Failed to fetch messages:', error);
      } finally {
        if (showLoading && isMounted) setIsLoading(false);
      }
    };

    fetchMessages(true);

    if (process.env.NEXT_PUBLIC_CHAT_USE_REALTIME === 'true') {
      const supabase = createOptionalClient();
      if (supabase) {
        const channel = supabase
          .channel(`chat:${activeRoomId}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'chat_messages',
              filter: `room_id=eq.${activeRoomId}`,
            },
            () => {
              if (isMounted) fetchMessages(false);
            }
          )
          .subscribe();

        return () => {
          isMounted = false;
          supabase.removeChannel(channel);
        };
      }
    }

    // Fallback: poll for new messages every 5 seconds, pausing when tab is hidden
    const poll = () => {
      if (document.visibilityState === 'hidden') return;
      fetchMessages(false);
    };

    const interval = setInterval(poll, 5000);

    const handleVisibilityChange = () => {
      // Resume immediately when tab becomes visible again
      if (document.visibilityState === 'visible') {
        fetchMessages(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMounted = false;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [activeRoomId]);

  // Track presence for live participant counts (or 30s fallback refresh)
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_CHAT_USE_REALTIME !== 'true') {
      // Fallback: periodically refresh room list to update counts
      const interval = setInterval(refreshRooms, 30000);
      return () => clearInterval(interval);
    }

    if (!activeRoomId) return;

    const supabase = createOptionalClient();
    if (!supabase) return;

    const channel = supabase.channel('chat-presence');

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<{ roomId: string }>();
        const counts = new Map<string, number>();
        Object.values(state).forEach((presences) => {
          presences.forEach((p) => {
            if (p.roomId) counts.set(p.roomId, (counts.get(p.roomId) || 0) + 1);
          });
        });
        setRooms((prev) =>
          prev.map((room) => ({
            ...room,
            participantCount: counts.get(room.id) ?? room.participantCount,
          }))
        );
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ roomId: activeRoomId });
        }
      });

    // 30s fallback for stale count correction
    const fallbackInterval = setInterval(refreshRooms, 30000);

    return () => {
      channel.untrack().catch(() => {});
      supabase.removeChannel(channel);
      clearInterval(fallbackInterval);
    };
  }, [activeRoomId, refreshRooms]);

  const value: ChatContextValue = {
    rooms,
    activeRoomId,
    messages,
    isMobileDrawerOpen,
    isLoading,
    isSending,
    hasMoreMessages,
    isLoadingMore,
    setActiveRoom,
    openMobileDrawer,
    closeMobileDrawer,
    sendMessage,
    refreshRooms,
    loadMoreMessages,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}

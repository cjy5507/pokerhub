'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import type { ChatRoomData, ChatMessageData } from '@/app/(social)/chat/actions';
import { getChatRooms, getChatMessages, sendChatMessage } from '@/app/(social)/chat/actions';
import { createOptionalClient } from '@/lib/supabase/client';

interface SenderInfo {
  id: string;
  nickname: string;
  avatarUrl: string | null;
  level: number;
}

interface ChatContextValue {
  rooms: ChatRoomData[];
  activeRoomId: string | null;
  messages: ChatMessageData[];
  isMobileDrawerOpen: boolean;
  isLoading: boolean;
  isSending: boolean;
  hasMoreMessages: boolean;
  isLoadingMore: boolean;
  disableRoomSubscription: boolean;
  setDisableRoomSubscription: (v: boolean) => void;
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
  const [disableRoomSubscription, setDisableRoomSubscription] = useState(false);
  const nextCursorRef = useRef<string | undefined>(undefined);
  const switchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const senderCacheRef = useRef<Map<string, SenderInfo>>(new Map());
  const roomsFetchedRef = useRef(false);

  // Issue 3: Clean up switchTimerRef on unmount
  useEffect(() => {
    return () => {
      if (switchTimerRef.current) clearTimeout(switchTimerRef.current);
    };
  }, []);

  // Issue 1: Reset messages whenever activeRoomId changes, regardless of drawer state
  useEffect(() => {
    setMessages([]);
    nextCursorRef.current = undefined;
    setHasMoreMessages(false);
  }, [activeRoomId]);

  const refreshRooms = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getChatRooms();
      if (result.rooms) {
        setRooms(result.rooms);
        roomsFetchedRef.current = true;
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
        // Cache sender info from loaded messages
        for (const msg of result.messages) {
          senderCacheRef.current.set(msg.sender.id, msg.sender);
        }
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
        // Cache sender info from our own message
        senderCacheRef.current.set(
          sendResult.message.sender.id,
          sendResult.message.sender
        );
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

  // Lazy room fetch: fetch once on mount, then re-fetch when drawer opens if empty
  useEffect(() => {
    if (!roomsFetchedRef.current) {
      refreshRooms();
    }
  }, [refreshRooms]);

  useEffect(() => {
    if (isMobileDrawerOpen && rooms.length === 0) {
      refreshRooms();
    }
  }, [isMobileDrawerOpen, rooms.length, refreshRooms]);

  // Auto-select first room when rooms load
  useEffect(() => {
    if (rooms.length > 0 && !activeRoomId) {
      setActiveRoomId(rooms[0].id);
    }
  }, [rooms, activeRoomId]);

  // Subscribe to messages via Supabase Realtime INSERT — only when drawer is open
  useEffect(() => {
    if (!activeRoomId) {
      setMessages([]);
      return;
    }

    if (disableRoomSubscription) {
      return;
    }

    let isMounted = true;
    nextCursorRef.current = undefined;
    setHasMoreMessages(false);
    // Initial fetch for current room
    const doInitialFetch = async () => {
      setIsLoading(true);
      try {
        const result = await getChatMessages(activeRoomId);
        if (isMounted && result.messages) {
          setMessages(result.messages);
          nextCursorRef.current = result.nextCursor;
          setHasMoreMessages(result.hasMore ?? false);
          // Cache sender info from initial messages
          for (const msg of result.messages) {
            senderCacheRef.current.set(msg.sender.id, msg.sender);
          }
        }
      } catch (error) {
        console.error('Failed to fetch messages:', error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    doInitialFetch();

    // Supabase Realtime subscription for new messages
    const supabase = createOptionalClient();
    let channel: ReturnType<NonNullable<ReturnType<typeof createOptionalClient>>['channel']> | null = null;

    if (supabase) {
      channel = supabase
        .channel(`chat:${activeRoomId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_messages',
            filter: `room_id=eq.${activeRoomId}`,
          },
          (payload) => {
            if (!isMounted) return;
            const row = payload.new as {
              id: string;
              room_id: string;
              sender_id: string;
              content: string;
              created_at: string;
              type: string;
            };

            // Look up sender from cache
            const cachedSender = senderCacheRef.current.get(row.sender_id);
            const sender: SenderInfo = cachedSender ?? {
              id: row.sender_id,
              nickname: '...',
              avatarUrl: null,
              level: 1,
            };

            const newMsg: ChatMessageData = {
              id: row.id,
              sender,
              content: row.content,
              createdAt: row.created_at,
            };

            setMessages((prev) => {
              if (prev.some((m) => m.id === row.id)) return prev;
              return [...prev, newMsg];
            });

            // If sender wasn't cached, fetch full message to update
            if (!cachedSender) {
              getChatMessages(activeRoomId).then((result) => {
                if (!isMounted || !result.messages) return;
                // Update sender cache and refresh the message with proper sender info
                for (const msg of result.messages) {
                  senderCacheRef.current.set(msg.sender.id, msg.sender);
                }
                const freshMsg = result.messages.find((m) => m.id === row.id);
                if (freshMsg) {
                  setMessages((prev) =>
                    prev.map((m) => (m.id === row.id ? freshMsg : m))
                  );
                }
              }).catch((err) => {
                console.warn('[ChatProvider] Failed to resolve sender info:', err);
              });
            }
          }
        )
        .subscribe();
    }

    return () => {
      isMounted = false;
      if (supabase && channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [activeRoomId, disableRoomSubscription]);

  // Refresh rooms every 30s only while drawer is open
  useEffect(() => {
    if (!isMobileDrawerOpen) return;

    const interval = setInterval(refreshRooms, 30000);
    return () => clearInterval(interval);
  }, [isMobileDrawerOpen, refreshRooms]);

  const value = useMemo<ChatContextValue>(
    () => ({
      rooms,
      activeRoomId,
      messages,
      isMobileDrawerOpen,
      isLoading,
      isSending,
      hasMoreMessages,
      isLoadingMore,
      disableRoomSubscription,
      setDisableRoomSubscription,
      setActiveRoom,
      openMobileDrawer,
      closeMobileDrawer,
      sendMessage,
      refreshRooms,
      loadMoreMessages,
    }),
    [
      rooms,
      activeRoomId,
      messages,
      isMobileDrawerOpen,
      isLoading,
      isSending,
      hasMoreMessages,
      isLoadingMore,
      disableRoomSubscription,
      setActiveRoom,
      openMobileDrawer,
      closeMobileDrawer,
      sendMessage,
      refreshRooms,
      loadMoreMessages,
    ]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}

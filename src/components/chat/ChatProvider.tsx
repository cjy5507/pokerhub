'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ChatRoomData, ChatMessageData } from '@/app/(social)/chat/actions';
import { getChatRooms, getChatMessages, sendChatMessage } from '@/app/(social)/chat/actions';

interface ChatContextValue {
  rooms: ChatRoomData[];
  activeRoomId: string | null;
  messages: ChatMessageData[];
  isMobileDrawerOpen: boolean;
  isLoading: boolean;
  isSending: boolean;
  setActiveRoom: (roomId: string) => void;
  openMobileDrawer: () => void;
  closeMobileDrawer: () => void;
  sendMessage: (content: string) => Promise<void>;
  refreshRooms: () => Promise<void>;
}

const ChatContext = createContext<ChatContextValue | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [rooms, setRooms] = useState<ChatRoomData[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);

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
    setActiveRoomId(roomId);
  }, []);

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
        setMessages(prev => [...prev, sendResult.message!]);
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

  // Fetch messages when active room changes
  useEffect(() => {
    if (!activeRoomId) {
      setMessages([]);
      return;
    }

    const fetchMessages = async () => {
      setIsLoading(true);
      try {
        const result = await getChatMessages(activeRoomId);
        if (result.messages) {
          setMessages(result.messages);
        }
      } catch (error) {
        console.error('Failed to fetch messages:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMessages();
  }, [activeRoomId]);

  const value: ChatContextValue = {
    rooms,
    activeRoomId,
    messages,
    isMobileDrawerOpen,
    isLoading,
    isSending,
    setActiveRoom,
    openMobileDrawer,
    closeMobileDrawer,
    sendMessage,
    refreshRooms,
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

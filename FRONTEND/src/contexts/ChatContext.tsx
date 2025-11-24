'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface ChatContextType {
  activeConversation: string | null;
  setActiveConversation: (conversationId: string | null) => void;
  unreadCounts: Map<string, number>;
  unreadCount: number; // Total unread count across all conversations
  setUnreadCount: (conversationId: string, count: number) => void;
  resetUnread: (conversationId: string) => void;
  incrementUnread: (conversationId: string) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [activeConversation, setActiveConversationState] = useState<string | null>(null);
  const [unreadCounts, setUnreadCounts] = useState<Map<string, number>>(new Map());

  const setActiveConversation = useCallback((conversationId: string | null) => {
    setActiveConversationState(conversationId);
  }, []);

  const setUnreadCount = useCallback((conversationId: string, count: number) => {
    setUnreadCounts((prev) => {
      const newMap = new Map(prev);
      newMap.set(conversationId, count);
      return newMap;
    });
  }, []);

  const resetUnread = useCallback((conversationId: string) => {
    setUnreadCounts((prev) => {
      const newMap = new Map(prev);
      newMap.set(conversationId, 0);
      return newMap;
    });
  }, []);

  const incrementUnread = useCallback((conversationId: string) => {
    setUnreadCounts((prev) => {
      const newMap = new Map(prev);
      const current = newMap.get(conversationId) || 0;
      newMap.set(conversationId, current + 1);
      return newMap;
    });
  }, []);

  // Calculate total unread count
  const unreadCount = Array.from(unreadCounts.values()).reduce((sum, count) => sum + count, 0);

  return (
    <ChatContext.Provider
      value={{
        activeConversation,
        setActiveConversation,
        unreadCounts,
        unreadCount,
        setUnreadCount,
        resetUnread,
        incrementUnread,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}

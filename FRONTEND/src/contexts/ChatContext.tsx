'use client';

import { createContext, useContext, useState, useCallback, ReactNode, useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import { socketService } from '@/lib/socket';
import { Message } from '@/types';
import api from '@/lib/api';

interface CallState {
  isActive: boolean;
  callType: 'audio' | 'video';
  isIncoming: boolean;
  caller: any | null;
  callOffer: RTCSessionDescriptionInit | null;
  conversationId: string | null;
}

interface ChatContextType {
  activeConversation: string | null;
  setActiveConversation: (conversationId: string | null) => void;
  unreadCounts: Map<string, number>;
  unreadCount: number; // Total unread count across all conversations
  setUnreadCount: (conversationId: string, count: number) => void;
  resetUnread: (conversationId: string) => void;
  incrementUnread: (conversationId: string) => void;
  refreshConversations: () => void;
  callState: CallState | null;
  setCallState: (state: CallState | null) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [activeConversation, setActiveConversationState] = useState<string | null>(null);
  const [unreadCounts, setUnreadCounts] = useState<Map<string, number>>(new Map());
  const [callState, setCallState] = useState<CallState | null>(null);
  const { isAuthenticated, user } = useAuthStore();
  const hasSetupSocket = useRef(false);
  const activeConversationRef = useRef<string | null>(null);
  const handleNewMessageRef = useRef<((message: Message) => void) | null>(null);

  useEffect(() => {
    activeConversationRef.current = activeConversation;
  }, [activeConversation]);

  const setActiveConversation = useCallback((conversationId: string | null) => {
    setActiveConversationState(conversationId);
    activeConversationRef.current = conversationId;
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

  const refreshConversations = useCallback(() => {
    if (isAuthenticated && user?.id) {
      api.get('/chat/conversations')
        .then((response) => {
          const conversations = response.data.data || [];
          const newUnreadCounts = new Map<string, number>();
          conversations.forEach((conv: any) => {
            if (conv.unread_count && conv.unread_count > 0) {
              newUnreadCounts.set(conv.id, conv.unread_count);
            }
          });
          setUnreadCounts(newUnreadCounts);
        })
        .catch(console.error);
    }
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      return;
    }

    const handleNewMessage = (message: Message) => {
      if (!message?.id || !message?.conversation_id || !message?.sender_id) {
        return;
      }

      if (message.sender_id !== user.id) {
        const currentActiveConv = activeConversationRef.current;
        const isActiveConv = currentActiveConv === message.conversation_id;
        
        if (!isActiveConv) {
          incrementUnread(message.conversation_id);
        } else {
          }

        const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
        const isOnChatPage = currentPath.startsWith('/chat');
        const isOnThisConvPage = currentPath === `/chat/${message.conversation_id}`;
        
        if ((!isOnChatPage || !isOnThisConvPage) && 'Notification' in window) {
          if (Notification.permission === 'granted') {
            const senderName = message.sender 
              ? `${message.sender.first_name} ${message.sender.last_name}` 
              : 'Someone';
            let body = '';
            
            if (message.message_type === 'image') body = '📷 gửi ảnh';
            else if (message.message_type === 'audio') body = '🎤 gửi tin nhắn thoại';
            else if (message.message_type === 'video') body = '🎥 gửi video';
            else if (message.message_type === 'sticker') body = '🎨 gửi sticker';
            else if (message.message_type === 'gif') body = '🎬 gửi GIF';
            else {
              body = message.content || 'gửi tin nhắn';
              if (body.length > 50) body = body.substring(0, 50) + '...';
            }
            
            try {
              const notification = new Notification(senderName, {
                body,
                icon: message.sender?.avatar_url || '/icon-192x192.png',
                tag: `message-${message.conversation_id}`,
                badge: '/icon-192x192.png',
                requireInteraction: false,
              });
              
              notification.onclick = () => {
                window.focus();
                if (typeof window !== 'undefined') {
                  window.location.href = `/chat/${message.conversation_id}`;
                }
                notification.close();
              };
              
              setTimeout(() => {
                notification.close();
              }, 5000);
            } catch (error) {
              }
          } else if (Notification.permission === 'default') {
            Notification.requestPermission().catch(console.error);
          }
        }
      }
    };

    handleNewMessageRef.current = handleNewMessage;

    const handleCallOffer = async (data: {
      conversationId: string;
      callType: 'audio' | 'video';
      offer: RTCSessionDescriptionInit;
      callerId: string;
      caller?: any;
    }) => {
      if (data.callerId === user?.id) {
        return;
      }

      setCallState({
        isActive: true,
        callType: data.callType,
        isIncoming: true,
        caller: data.caller || null,
        callOffer: data.offer,
        conversationId: data.conversationId,
      });

      try {
        const audio = new Audio('/notification.mp3');
        audio.play().catch(() => {});
      } catch (e) {
      }

      if ('Notification' in window && Notification.permission === 'granted') {
        const callerName = data.caller
          ? `${data.caller.first_name} ${data.caller.last_name}`
          : 'Someone';
        const callTypeText = data.callType === 'video' ? 'Video' : 'Audio';
        
        try {
          const notification = new Notification(`Incoming ${callTypeText} Call`, {
            body: `${callerName} is calling you`,
            icon: data.caller?.avatar_url || '/icon-192x192.png',
            tag: `call-${data.conversationId}`,
            requireInteraction: true,
            badge: '/icon-192x192.png',
          });

          notification.onclick = () => {
            window.focus();
            if (typeof window !== 'undefined') {
              window.location.href = `/chat/${data.conversationId}`;
            }
            notification.close();
          };
        } catch (error) {
          }
      }
    };

    const setupSocket = async () => {
      try {
        const socket = await socketService.connect();
        if (socket) {
          socketService.onNewMessage(handleNewMessage);
          socketService.onCallOffer(handleCallOffer);
          
          socketService.onError((error: { message: string; conversationId?: string }) => {
            if (!error.message.includes('Not a participant') && !error.message.includes('Failed to join')) {
              if (error.message.includes('Authentication') || error.message.includes('connection')) {
                }
            }
          });
          
          setTimeout(async () => {
            if (user?.id && socket?.connected) {
              try {
                const response = await api.get('/chat/conversations');
                const conversations = response.data.data || [];
                conversations.forEach((conv: any, index: number) => {
                  setTimeout(() => {
                    try {
                      socketService.joinConversation(conv.id);
                      } catch (error) {
                      }
                  }, index * 50); // 50ms delay between each join
                });
              } catch (error) {
                }
            }
          }, 500); // Wait 500ms after socket connection
        }
      } catch (error) {
        }
    };

    setupSocket();

    refreshConversations();

    return () => {
      if (handleNewMessageRef.current) {
        socketService.offNewMessage(handleNewMessageRef.current);
      }
      socketService.offCallOffer(handleCallOffer);
      socketService.offError(() => {}); // Remove error handler
      handleNewMessageRef.current = null;
    };
  }, [isAuthenticated, user?.id, incrementUnread, refreshConversations]);

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
        refreshConversations,
        callState,
        setCallState,
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

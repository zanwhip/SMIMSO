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

  // Keep ref in sync with state
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
    // Fetch và sync unread counts
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

  // Global socket listener for new messages
  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      return;
    }

    console.log('🔌 [ChatContext] Setting up global socket listeners');

    const handleNewMessage = (message: Message) => {
      if (!message?.id || !message?.conversation_id || !message?.sender_id) {
        console.error('❌ [ChatContext] Invalid message:', message);
        return;
      }

      console.log('📨 [ChatContext] Global new message received:', {
        id: message.id,
        convId: message.conversation_id,
        senderId: message.sender_id,
        currentUserId: user.id,
        activeConversation: activeConversationRef.current,
      });

      // Chỉ xử lý nếu không phải tin nhắn của mình
      if (message.sender_id !== user.id) {
        const currentActiveConv = activeConversationRef.current;
        const isActiveConv = currentActiveConv === message.conversation_id;
        
        // Nếu không đang xem conversation này, increment unread
        if (!isActiveConv) {
          console.log('📨 [ChatContext] Incrementing unread for conversation:', message.conversation_id);
          incrementUnread(message.conversation_id);
        } else {
          console.log('📨 [ChatContext] Message for active conversation, not incrementing unread');
        }

        // Show browser notification nếu không đang ở trang chat hoặc conversation đó
        const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
        const isOnChatPage = currentPath.startsWith('/chat');
        const isOnThisConvPage = currentPath === `/chat/${message.conversation_id}`;
        
        // Hiển thị thông báo nếu:
        // 1. Không đang ở trang chat
        // 2. Hoặc đang ở trang chat nhưng không phải conversation này
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
              
              // Click notification to open conversation
              notification.onclick = () => {
                window.focus();
                if (typeof window !== 'undefined') {
                  window.location.href = `/chat/${message.conversation_id}`;
                }
                notification.close();
              };
              
              // Auto close after 5 seconds
              setTimeout(() => {
                notification.close();
              }, 5000);
            } catch (error) {
              console.error('Failed to show notification:', error);
            }
          } else if (Notification.permission === 'default') {
            // Request permission if not yet asked
            Notification.requestPermission().catch(console.error);
          }
        }
      }
    };

    handleNewMessageRef.current = handleNewMessage;

    // Handle call offer globally
    const handleCallOffer = async (data: {
      conversationId: string;
      callType: 'audio' | 'video';
      offer: RTCSessionDescriptionInit;
      callerId: string;
      caller?: any;
    }) => {
      // Only show if not from current user
      if (data.callerId === user?.id) {
        return;
      }

      console.log('📞 [ChatContext] Global call offer received:', data);

      // Set call state to show call modal
      setCallState({
        isActive: true,
        callType: data.callType,
        isIncoming: true,
        caller: data.caller || null,
        callOffer: data.offer,
        conversationId: data.conversationId,
      });

      // Play notification sound
      try {
        const audio = new Audio('/notification.mp3');
        audio.play().catch(() => {});
      } catch (e) {
        // Ignore
      }

      // Show browser notification
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
          console.error('Failed to show call notification:', error);
        }
      }
    };

    // Connect socket and setup listeners
    const setupSocket = async () => {
      try {
        const socket = await socketService.connect();
        if (socket) {
          console.log('✅ [ChatContext] Socket connected, setting up global listeners');
          socketService.onNewMessage(handleNewMessage);
          socketService.onCallOffer(handleCallOffer);
          
          // Setup error handler
          socketService.onError((error: { message: string; conversationId?: string }) => {
            console.error('❌ [ChatContext] Socket error:', error);
            // Don't show toast for participant errors - they're handled in chat pages
            if (!error.message.includes('Not a participant') && !error.message.includes('Failed to join')) {
              // Only show critical errors
              if (error.message.includes('Authentication') || error.message.includes('connection')) {
                console.error('Critical socket error:', error);
              }
            }
          });
          
          // Auto-join all user conversations when connected
          // Wait a bit for socket to be fully ready
          setTimeout(async () => {
            if (user?.id && socket?.connected) {
              try {
                const response = await api.get('/chat/conversations');
                const conversations = response.data.data || [];
                console.log(`📥 [ChatContext] Auto-joining ${conversations.length} conversations`);
                
                // Join conversations with a small delay between each to avoid overwhelming
                conversations.forEach((conv: any, index: number) => {
                  setTimeout(() => {
                    try {
                      socketService.joinConversation(conv.id);
                      console.log(`✅ [ChatContext] Auto-joined conversation: ${conv.id}`);
                    } catch (error) {
                      console.error(`Failed to join conversation ${conv.id}:`, error);
                    }
                  }, index * 50); // 50ms delay between each join
                });
              } catch (error) {
                console.error('Failed to fetch conversations for auto-join:', error);
              }
            }
          }, 500); // Wait 500ms after socket connection
        }
      } catch (error) {
        console.error('Failed to connect socket in ChatContext:', error);
      }
    };

    setupSocket();

    // Refresh conversations on mount
    refreshConversations();

    return () => {
      console.log('🔌 [ChatContext] Cleaning up global socket listeners');
      if (handleNewMessageRef.current) {
        socketService.offNewMessage(handleNewMessageRef.current);
      }
      socketService.offCallOffer(handleCallOffer);
      socketService.offError(() => {}); // Remove error handler
      handleNewMessageRef.current = null;
    };
  }, [isAuthenticated, user?.id, incrementUnread, refreshConversations]);

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

'use client';

import { createContext, useContext, useState, useCallback, ReactNode, useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import { socketService } from '@/lib/socket';
import { Message } from '@/types';
import api from '@/lib/api';
import { usePathname } from 'next/navigation';
import toast from 'react-hot-toast';

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
  const pathname = usePathname();
  const hasSetupSocket = useRef(false);
  const activeConversationRef = useRef<string | null>(null);
  const handleNewMessageRef = useRef<((message: Message) => void) | null>(null);
  const lastToastRef = useRef<Map<string, string>>(new Map()); // Track last toast per conversation

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

  const refreshConversations = useCallback(() => {
    if (isAuthenticated && user?.id) {
      console.log('[ChatContext] refreshConversations called');
      api.get('/chat/conversations')
        .then((response) => {
          const conversations = response.data.data || [];
          console.log('[ChatContext] Conversations fetched', {
            count: conversations.length,
            conversations: conversations.map((c: any) => ({
              id: c.id,
              unread_count: c.unread_count,
            })),
          });
          
          const newUnreadCounts = new Map<string, number>();
          conversations.forEach((conv: any) => {
            if (conv.unread_count && conv.unread_count > 0) {
              newUnreadCounts.set(conv.id, conv.unread_count);
            }
          });
          
          console.log('[ChatContext] Setting unread counts', {
            unreadCounts: Array.from(newUnreadCounts.entries()),
            totalUnread: Array.from(newUnreadCounts.values()).reduce((a, b) => a + b, 0),
          });
          
          setUnreadCounts(newUnreadCounts);
        })
        .catch((error) => {
          console.error('[ChatContext] Error fetching conversations', error);
        });
    }
  }, [isAuthenticated, user?.id]);

  const incrementUnread = useCallback((conversationId: string) => {
    console.log('[ChatContext] incrementUnread called', {
      conversationId,
    });
    
    setUnreadCounts((prev) => {
      const newMap = new Map(prev);
      const current = newMap.get(conversationId) || 0;
      const newCount = current + 1;
      newMap.set(conversationId, newCount);
      
      console.log('[ChatContext] Unread count updated', {
        conversationId,
        previousCount: current,
        newCount,
        totalUnread: Array.from(newMap.values()).reduce((a, b) => a + b, 0),
      });
      
      return newMap;
    });
    
    // Refresh conversations after a short delay to sync with server
    setTimeout(() => {
      refreshConversations();
    }, 1000);
  }, [refreshConversations]);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      return;
    }

    const handleNewMessage = (message: Message) => {
      console.log('[ChatContext] handleNewMessage received', {
        messageId: message?.id,
        conversationId: message?.conversation_id,
        senderId: message?.sender_id,
        currentUserId: user?.id,
        activeConversation: activeConversationRef.current,
        pathname: pathname,
      });
      
      if (!message?.id || !message?.conversation_id || !message?.sender_id) {
        console.warn('[ChatContext] Invalid message received', { message });
        return;
      }

      if (message.sender_id !== user.id) {
        const currentActiveConv = activeConversationRef.current;
        const isActiveConv = currentActiveConv === message.conversation_id;
        
        console.log('[ChatContext] Message from other user', {
          isActiveConv,
          currentActiveConv,
          messageConvId: message.conversation_id,
        });
        
        if (!isActiveConv) {
          console.log('[ChatContext] Incrementing unread count', {
            conversationId: message.conversation_id,
          });
          incrementUnread(message.conversation_id);
        } else {
          console.log('[ChatContext] Message is for active conversation, not incrementing unread');
        }

        const currentPath = pathname || (typeof window !== 'undefined' ? window.location.pathname : '');
        const isOnChatPage = currentPath.startsWith('/chat');
        const isOnThisConvPage = currentPath === `/chat/${message.conversation_id}`;
        
        // Show toast notification when not on chat page
        if (!isOnChatPage || !isOnThisConvPage) {
          const senderName = message.sender 
            ? `${message.sender.first_name} ${message.sender.last_name}` 
            : 'Someone';
          
          // Prevent duplicate toasts for same conversation (within 2 seconds)
          const lastToastTime = lastToastRef.current.get(message.conversation_id);
          const now = Date.now();
          if (!lastToastTime || (now - parseInt(lastToastTime)) > 2000) {
            lastToastRef.current.set(message.conversation_id, now.toString());
            
            toast(
              `Message (${senderName} sent you a message)`,
              {
                duration: 4000,
                position: 'bottom-left',
                style: {
                  background: '#363636',
                  color: '#fff',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                },
                icon: '💬',
              }
            );
          }
        }
        
        // Browser notification (if permission granted)
        if ((!isOnChatPage || !isOnThisConvPage) && 'Notification' in window) {
          if (Notification.permission === 'granted') {
            const senderName = message.sender 
              ? `${message.sender.first_name} ${message.sender.last_name}` 
              : 'Someone';
            let body = '';
            
            if (message.message_type === 'image') body = '📷 sent an image';
            else if (message.message_type === 'audio') body = '🎤 sent a voice message';
            else if (message.message_type === 'video') body = '🎥 sent a video';
            else if (message.message_type === 'sticker') body = '🎨 sent a sticker';
            else if (message.message_type === 'gif') body = '🎬 sent a GIF';
            else {
              body = message.content || 'sent a message';
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
  }, [isAuthenticated, user?.id, incrementUnread, refreshConversations, pathname]);

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

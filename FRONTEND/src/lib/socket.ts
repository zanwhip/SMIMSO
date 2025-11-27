import { io, Socket } from 'socket.io-client';
import { Message, Conversation } from '@/types';
import { getAuthToken } from './api';
import { getSession } from 'next-auth/react';

// Simple toast for errors (avoid circular dependency)
const showError = (message: string) => {
  if (typeof window !== 'undefined' && (window as any).toast) {
    (window as any).toast.error(message);
  } else {
    console.error(message);
  }
};

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

class SocketService {
  private socket: Socket | null = null;
  private isConnecting = false;

  async connect(): Promise<Socket | null> {
    if (this.socket?.connected) {
      return this.socket;
    }

    if (this.isConnecting) {
      return this.socket;
    }

    this.isConnecting = true;
    
    // Try to get token from NextAuth session first, then fallback to localStorage
    let token: string | null = null;
    try {
      const session = await getSession();
      token = (session as any)?.accessToken || getAuthToken();
    } catch (error) {
      token = getAuthToken();
    }

    if (!token) {
      console.error('No token available for socket connection');
      this.isConnecting = false;
      return null;
    }

    try {
      this.socket = io(SOCKET_URL, {
        auth: {
          token,
        },
        transports: ['polling', 'websocket'], // Try polling first, then websocket
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
        forceNew: false,
      });

      this.socket.on('connect', () => {
        console.log('✅ Socket connected:', this.socket?.id);
        this.isConnecting = false;
        
        // Re-register all message callbacks on reconnect
        if (this.newMessageCallbacks.size > 0) {
          const messageHandler = (message: Message) => {
            console.log('📨 [Reconnect] new_message:', message.id);
            this.newMessageCallbacks.forEach(cb => {
              try {
                cb(message);
              } catch (error) {
                console.error('Error in callback:', error);
              }
            });
          };
          // Remove all existing listeners first
          this.socket?.removeAllListeners('new_message');
          this.socket?.on('new_message', messageHandler);
          console.log('✅ Re-registered listeners after reconnect');
        }
      });

      this.socket.on('disconnect', (reason) => {
        console.log('👋 Socket disconnected:', reason);
        if (reason === 'io server disconnect') {
          // Server disconnected the socket, reconnect manually
          this.socket?.connect();
        }
      });

      this.socket.on('connect_error', (error) => {
        console.error('❌ Socket connection error:', error);
        this.isConnecting = false;
        // Don't show error toast on every connection attempt
        // Only show after multiple failed attempts
        if (error.message?.includes('websocket error')) {
          console.warn('⚠️ WebSocket connection failed, will retry with polling...');
        }
      });

      this.socket.on('reconnect', (attemptNumber) => {
        console.log('🔄 Socket reconnected after', attemptNumber, 'attempts');
      });

      this.socket.on('reconnect_attempt', (attemptNumber) => {
        console.log('🔄 Reconnection attempt', attemptNumber);
      });

      this.socket.on('reconnect_error', (error) => {
        console.error('❌ Reconnection error:', error);
      });

      this.socket.on('reconnect_failed', () => {
        console.error('❌ Reconnection failed');
        showError('Không thể kết nối đến server. Vui lòng refresh trang.');
      });

      return this.socket;
    } catch (error) {
      console.error('Failed to create socket connection:', error);
      this.isConnecting = false;
      return null;
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnecting = false;
  }

  // Get socket synchronously if already connected, otherwise return null
  getSocketSync(): Socket | null {
    if (this.socket?.connected) {
      return this.socket;
    }
    return null;
  }

  async getSocket(): Promise<Socket | null> {
    if (!this.socket || !this.socket.connected) {
      return await this.connect();
    }
    return this.socket;
  }

  // Conversation events
  joinConversation(conversationId: string) {
    const join = (socket: Socket) => {
      if (socket && socket.connected) {
        console.log('🔌 Joining conversation:', conversationId);
        socket.emit('join_conversation', conversationId);
        // Also ensure we're listening for messages in this conversation
        console.log('✅ Joined and listening for conversation:', conversationId);
      } else {
        console.warn('⚠️ Socket not connected, cannot join conversation:', conversationId);
      }
    };

    const socket = this.getSocketSync();
    if (socket && socket.connected) {
      join(socket);
    } else {
      // Connect first, then join
      this.connect().then((socket) => {
        if (socket) {
          if (socket.connected) {
            join(socket);
          } else {
            socket.once('connect', () => {
              join(socket);
            });
          }
        }
      }).catch(console.error);
    }
  }

  leaveConversation(conversationId: string) {
    const socket = this.getSocketSync();
    if (socket) {
      socket.emit('leave_conversation', conversationId);
    }
  }

  // Message events
  private newMessageCallbacks: Set<(message: Message) => void> = new Set();

  onNewMessage(callback: (message: Message) => void) {
    // Store callback
    this.newMessageCallbacks.add(callback);
    console.log('📝 Registered callback, total:', this.newMessageCallbacks.size);
    
    const setupListener = (socket: Socket) => {
      if (!socket) return;
      
      // Create handler that calls all callbacks
      const handler = (message: Message) => {
        console.log('📨 [Socket] new_message received:', message.id, 'conversation:', message.conversation_id);
        this.newMessageCallbacks.forEach(cb => {
          try {
            cb(message);
          } catch (error) {
            console.error('Callback error:', error);
          }
        });
      };
      
      // Remove all existing listeners first to avoid duplicates
      socket.removeAllListeners('new_message');
      socket.on('new_message', handler);
      console.log('✅ Listener setup complete for new_message');
    };

    const socket = this.getSocketSync();
    if (socket?.connected) {
      setupListener(socket);
    } else {
      this.connect().then((s) => {
        if (s) {
          if (s.connected) {
            setupListener(s);
          } else {
            s.once('connect', () => setupListener(s));
          }
        }
      }).catch(console.error);
    }
  }

  offNewMessage(callback: (message: Message) => void) {
    this.newMessageCallbacks.delete(callback);
    const socket = this.getSocketSync();
    if (socket) {
      // Note: We can't remove specific callback since we use a wrapper
      // But removing from Set is enough to prevent it from being called
      console.log('✅ Removed new_message callback, remaining:', this.newMessageCallbacks.size);
    }
  }

  onConversationUpdated(callback: (data: { conversationId: string; message: Message }) => void) {
    const socket = this.getSocketSync();
    if (socket) {
      socket.on('conversation_updated', callback);
    } else {
      // Try to connect and then add listener
      this.connect().then((socket) => {
        if (socket) {
          socket.on('conversation_updated', callback);
        }
      }).catch(console.error);
    }
  }

  offConversationUpdated(callback: (data: { conversationId: string; message: Message }) => void) {
    const socket = this.getSocketSync();
    if (socket) {
      socket.off('conversation_updated', callback);
    }
  }

  onMessageSent(callback: (data: { messageId: string }) => void) {
    const socket = this.getSocketSync();
    if (socket) {
      socket.on('message_sent', callback);
    } else {
      this.connect().then((socket) => {
        if (socket) {
          socket.on('message_sent', callback);
        }
      }).catch(console.error);
    }
  }

  offMessageSent(callback: (data: { messageId: string }) => void) {
    const socket = this.getSocketSync();
    if (socket) {
      socket.off('message_sent', callback);
    }
  }

  sendMessage(data: {
    conversationId: string;
    messageType: Message['message_type'];
    content?: string;
    fileUrl?: string;
    fileName?: string;
    fileSize?: number;
    replyToId?: string;
  }) {
    const send = (socket: Socket) => {
      if (socket && socket.connected) {
        console.log('📤 Sending message:', data);
        socket.emit('send_message', data);
      } else {
        console.error('❌ Socket not connected, cannot send message');
      }
    };

    const socket = this.getSocketSync();
    if (socket && socket.connected) {
      send(socket);
    } else {
      // Connect first, then send
      this.connect().then((socket) => {
        if (socket) {
          if (socket.connected) {
            send(socket);
          } else {
            socket.once('connect', () => {
              send(socket);
            });
          }
        }
      }).catch((error) => {
        console.error('Failed to connect socket for sending message:', error);
      });
    }
  }

  // Typing events
  onUserTyping(callback: (data: { userId: string; conversationId: string; isTyping: boolean }) => void) {
    const socket = this.getSocketSync();
    if (socket) {
      socket.on('user_typing', callback);
    } else {
      this.connect().then((socket) => {
        if (socket) {
          socket.on('user_typing', callback);
        }
      }).catch(console.error);
    }
  }

  offUserTyping(callback: (data: { userId: string; conversationId: string; isTyping: boolean }) => void) {
    const socket = this.getSocketSync();
    if (socket) {
      socket.off('user_typing', callback);
    }
  }

  startTyping(conversationId: string) {
    const socket = this.getSocketSync();
    if (socket) {
      socket.emit('typing_start', { conversationId });
    } else {
      this.connect().then((socket) => {
        if (socket) {
          socket.emit('typing_start', { conversationId });
        }
      }).catch(console.error);
    }
  }

  stopTyping(conversationId: string) {
    const socket = this.getSocketSync();
    if (socket) {
      socket.emit('typing_stop', { conversationId });
    } else {
      this.connect().then((socket) => {
        if (socket) {
          socket.emit('typing_stop', { conversationId });
        }
      }).catch(console.error);
    }
  }

  // Call events (WebRTC)
  onCallOffer(callback: (data: {
    conversationId: string;
    callType: 'audio' | 'video';
    offer: RTCSessionDescriptionInit;
    callerId: string;
    caller?: any; // User object
  }) => void) {
    const socket = this.getSocketSync();
    if (socket) {
      socket.on('call_offer', callback);
    } else {
      this.connect().then((socket) => {
        if (socket) {
          socket.on('call_offer', callback);
        }
      }).catch(console.error);
    }
  }

  offCallOffer(callback: (data: {
    conversationId: string;
    callType: 'audio' | 'video';
    offer: RTCSessionDescriptionInit;
    callerId: string;
  }) => void) {
    const socket = this.getSocketSync();
    if (socket) {
      socket.off('call_offer', callback);
    }
  }

  onCallAnswer(callback: (data: {
    conversationId: string;
    answer: RTCSessionDescriptionInit;
    userId: string;
  }) => void) {
    const socket = this.getSocketSync();
    if (socket) {
      socket.on('call_answer', callback);
    } else {
      this.connect().then((socket) => {
        if (socket) {
          socket.on('call_answer', callback);
        }
      }).catch(console.error);
    }
  }

  offCallAnswer(callback: (data: {
    conversationId: string;
    answer: RTCSessionDescriptionInit;
    userId: string;
  }) => void) {
    const socket = this.getSocketSync();
    if (socket) {
      socket.off('call_answer', callback);
    }
  }

  onCallIceCandidate(callback: (data: {
    conversationId: string;
    candidate: RTCIceCandidateInit;
    userId: string;
  }) => void) {
    const socket = this.getSocketSync();
    if (socket) {
      socket.on('call_ice_candidate', callback);
    } else {
      this.connect().then((socket) => {
        if (socket) {
          socket.on('call_ice_candidate', callback);
        }
      }).catch(console.error);
    }
  }

  offCallIceCandidate(callback: (data: {
    conversationId: string;
    candidate: RTCIceCandidateInit;
    userId: string;
  }) => void) {
    const socket = this.getSocketSync();
    if (socket) {
      socket.off('call_ice_candidate', callback);
    }
  }

  onCallEnd(callback: (data: { conversationId: string; userId: string }) => void) {
    const socket = this.getSocketSync();
    if (socket) {
      socket.on('call_end', callback);
    } else {
      this.connect().then((socket) => {
        if (socket) {
          socket.on('call_end', callback);
        }
      }).catch(console.error);
    }
  }

  offCallEnd(callback: (data: { conversationId: string; userId: string }) => void) {
    const socket = this.getSocketSync();
    if (socket) {
      socket.off('call_end', callback);
    }
  }

  onCallDecline(callback: (data: { conversationId: string; userId: string }) => void) {
    const socket = this.getSocketSync();
    if (socket) {
      socket.on('call_decline', callback);
    } else {
      this.connect().then((socket) => {
        if (socket) {
          socket.on('call_decline', callback);
        }
      }).catch(console.error);
    }
  }

  offCallDecline(callback: (data: { conversationId: string; userId: string }) => void) {
    const socket = this.getSocketSync();
    if (socket) {
      socket.off('call_decline', callback);
    }
  }

  // Send call signaling
  sendCallOffer(conversationId: string, callType: 'audio' | 'video', offer: RTCSessionDescriptionInit) {
    const socket = this.getSocketSync();
    if (socket) {
      socket.emit('call_offer', { conversationId, callType, offer });
    } else {
      this.connect().then((socket) => {
        if (socket) {
          socket.emit('call_offer', { conversationId, callType, offer });
        }
      }).catch(console.error);
    }
  }

  sendCallAnswer(conversationId: string, answer: RTCSessionDescriptionInit) {
    const socket = this.getSocketSync();
    if (socket) {
      socket.emit('call_answer', { conversationId, answer });
    } else {
      this.connect().then((socket) => {
        if (socket) {
          socket.emit('call_answer', { conversationId, answer });
        }
      }).catch(console.error);
    }
  }

  sendCallIceCandidate(conversationId: string, candidate: RTCIceCandidateInit) {
    const socket = this.getSocketSync();
    if (socket) {
      socket.emit('call_ice_candidate', { conversationId, candidate });
    } else {
      this.connect().then((socket) => {
        if (socket) {
          socket.emit('call_ice_candidate', { conversationId, candidate });
        }
      }).catch(console.error);
    }
  }

  sendCallEnd(conversationId: string, callType: 'audio' | 'video', duration?: number) {
    const socket = this.getSocketSync();
    if (socket) {
      socket.emit('call_end', { conversationId, callType, duration: duration || 0 });
    } else {
      this.connect().then((socket) => {
        if (socket) {
          socket.emit('call_end', { conversationId, callType, duration: duration || 0 });
        }
      }).catch(console.error);
    }
  }

  sendCallDecline(conversationId: string, callType: 'audio' | 'video') {
    const socket = this.getSocketSync();
    if (socket) {
      socket.emit('call_decline', { conversationId, callType });
    } else {
      this.connect().then((socket) => {
        if (socket) {
          socket.emit('call_decline', { conversationId, callType });
        }
      }).catch(console.error);
    }
  }

  // Error handling
  onError(callback: (error: { message: string; conversationId?: string }) => void) {
    const socket = this.getSocketSync();
    if (socket) {
      socket.on('error', callback);
    } else {
      this.connect().then((socket) => {
        if (socket) {
          socket.on('error', callback);
        }
      }).catch(console.error);
    }
  }

  offError(callback: (error: { message: string; conversationId?: string }) => void) {
    const socket = this.getSocketSync();
    if (socket) {
      socket.off('error', callback);
    }
  }

  // Reactions
  addReaction(messageId: string, emoji: string) {
    const socket = this.getSocketSync();
    if (socket) {
      socket.emit('add_reaction', { messageId, emoji });
    } else {
      this.connect().then((socket) => {
        if (socket) {
          socket.emit('add_reaction', { messageId, emoji });
        }
      }).catch(console.error);
    }
  }

  removeReaction(messageId: string, emoji: string) {
    const socket = this.getSocketSync();
    if (socket) {
      socket.emit('remove_reaction', { messageId, emoji });
    } else {
      this.connect().then((socket) => {
        if (socket) {
          socket.emit('remove_reaction', { messageId, emoji });
        }
      }).catch(console.error);
    }
  }

  onReactionAdded(callback: (data: { messageId: string; userId: string; emoji: string }) => void) {
    const socket = this.getSocketSync();
    if (socket) {
      socket.on('reaction_added', callback);
    } else {
      this.connect().then((socket) => {
        if (socket) {
          socket.on('reaction_added', callback);
        }
      }).catch(console.error);
    }
  }

  offReactionAdded(callback: (data: { messageId: string; userId: string; emoji: string }) => void) {
    const socket = this.getSocketSync();
    if (socket) {
      socket.off('reaction_added', callback);
    }
  }

  onReactionRemoved(callback: (data: { messageId: string; userId: string; emoji: string }) => void) {
    const socket = this.getSocketSync();
    if (socket) {
      socket.on('reaction_removed', callback);
    } else {
      this.connect().then((socket) => {
        if (socket) {
          socket.on('reaction_removed', callback);
        }
      }).catch(console.error);
    }
  }

  offReactionRemoved(callback: (data: { messageId: string; userId: string; emoji: string }) => void) {
    const socket = this.getSocketSync();
    if (socket) {
      socket.off('reaction_removed', callback);
    }
  }

  // Edit/Delete messages
  editMessage(messageId: string, content: string) {
    const socket = this.getSocketSync();
    if (socket) {
      socket.emit('edit_message', { messageId, content });
    } else {
      this.connect().then((socket) => {
        if (socket) {
          socket.emit('edit_message', { messageId, content });
        }
      }).catch(console.error);
    }
  }

  deleteMessage(messageId: string) {
    const socket = this.getSocketSync();
    if (socket) {
      socket.emit('delete_message', { messageId });
    } else {
      this.connect().then((socket) => {
        if (socket) {
          socket.emit('delete_message', { messageId });
        }
      }).catch(console.error);
    }
  }

  onMessageEdited(callback: (message: Message) => void) {
    const socket = this.getSocketSync();
    if (socket) {
      socket.on('message_edited', callback);
    } else {
      this.connect().then((socket) => {
        if (socket) {
          socket.on('message_edited', callback);
        }
      }).catch(console.error);
    }
  }

  offMessageEdited(callback: (message: Message) => void) {
    const socket = this.getSocketSync();
    if (socket) {
      socket.off('message_edited', callback);
    }
  }

  onMessageDeleted(callback: (data: { messageId: string }) => void) {
    const socket = this.getSocketSync();
    if (socket) {
      socket.on('message_deleted', callback);
    } else {
      this.connect().then((socket) => {
        if (socket) {
          socket.on('message_deleted', callback);
        }
      }).catch(console.error);
    }
  }

  offMessageDeleted(callback: (data: { messageId: string }) => void) {
    const socket = this.getSocketSync();
    if (socket) {
      socket.off('message_deleted', callback);
    }
  }

  // Online status
  updateOnlineStatus(isOnline: boolean) {
    const socket = this.getSocketSync();
    if (socket) {
      socket.emit('update_online_status', { isOnline });
    } else {
      this.connect().then((socket) => {
        if (socket) {
          socket.emit('update_online_status', { isOnline });
        }
      }).catch(console.error);
    }
  }

  onUserOnlineStatus(callback: (data: { userId: string; isOnline: boolean; lastSeen: string }) => void) {
    const socket = this.getSocketSync();
    if (socket) {
      socket.on('user_online_status', callback);
    } else {
      this.connect().then((socket) => {
        if (socket) {
          socket.on('user_online_status', callback);
        }
      }).catch(console.error);
    }
  }

  offUserOnlineStatus(callback: (data: { userId: string; isOnline: boolean; lastSeen: string }) => void) {
    const socket = this.getSocketSync();
    if (socket) {
      socket.off('user_online_status', callback);
    }
  }

  // Group management
  addGroupMember(conversationId: string, userId: string) {
    const socket = this.getSocketSync();
    if (socket) {
      socket.emit('add_group_member', { conversationId, userId });
    } else {
      this.connect().then((socket) => {
        if (socket) {
          socket.emit('add_group_member', { conversationId, userId });
        }
      }).catch(console.error);
    }
  }

  removeGroupMember(conversationId: string, userId: string) {
    const socket = this.getSocketSync();
    if (socket) {
      socket.emit('remove_group_member', { conversationId, userId });
    } else {
      this.connect().then((socket) => {
        if (socket) {
          socket.emit('remove_group_member', { conversationId, userId });
        }
      }).catch(console.error);
    }
  }

  onMemberAdded(callback: (data: { conversationId: string; userId: string; conversation: Conversation }) => void) {
    const socket = this.getSocketSync();
    if (socket) {
      socket.on('member_added', callback);
    } else {
      this.connect().then((socket) => {
        if (socket) {
          socket.on('member_added', callback);
        }
      }).catch(console.error);
    }
  }

  offMemberAdded(callback: (data: { conversationId: string; userId: string; conversation: Conversation }) => void) {
    const socket = this.getSocketSync();
    if (socket) {
      socket.off('member_added', callback);
    }
  }

  onMemberRemoved(callback: (data: { conversationId: string; userId: string }) => void) {
    const socket = this.getSocketSync();
    if (socket) {
      socket.on('member_removed', callback);
    } else {
      this.connect().then((socket) => {
        if (socket) {
          socket.on('member_removed', callback);
        }
      }).catch(console.error);
    }
  }

  offMemberRemoved(callback: (data: { conversationId: string; userId: string }) => void) {
    const socket = this.getSocketSync();
    if (socket) {
      socket.off('member_removed', callback);
    }
  }
}

export const socketService = new SocketService();


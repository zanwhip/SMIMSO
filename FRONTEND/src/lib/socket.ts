import { io, Socket } from 'socket.io-client';
import { Message, Conversation } from '@/types';
import { getAuthToken } from './api';
import { getSession } from 'next-auth/react';

const showError = (message: string) => {
  if (typeof window !== 'undefined' && (window as any).toast) {
    (window as any).toast.error(message);
  } else {
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
    
    let token: string | null = null;
    try {
      const session = await getSession();
      token = (session as any)?.accessToken || getAuthToken();
    } catch (error) {
      token = getAuthToken();
    }

    if (!token) {
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
        this.isConnecting = false;
        
        if (this.newMessageCallbacks.size > 0) {
          const messageHandler = (message: Message) => {
            this.newMessageCallbacks.forEach(cb => {
              try {
                cb(message);
              } catch (error) {
              }
            });
          };
          this.socket?.removeAllListeners('new_message');
          this.socket?.on('new_message', messageHandler);
        }
      });

      this.socket.on('disconnect', (reason) => {
        if (reason === 'io server disconnect') {
          this.socket?.connect();
        }
      });

      this.socket.on('connect_error', (error) => {
        this.isConnecting = false;
        if (error.message?.includes('websocket error')) {
          }
      });

      this.socket.on('reconnect', (attemptNumber) => {
        // Re-register message handler after reconnect
        if (this.newMessageCallbacks.size > 0) {
          const messageHandler = (message: Message) => {
            this.newMessageCallbacks.forEach(cb => {
              try {
                cb(message);
              } catch (error) {
              }
            });
          };
          this.socket?.removeAllListeners('new_message');
          this.socket?.on('new_message', messageHandler);
        }
      });

      this.socket.on('reconnect_attempt', (attemptNumber) => {
        });

      this.socket.on('reconnect_error', (error) => {
        });

      this.socket.on('reconnect_failed', () => {
        showError('Không thể kết nối đến server. Vui lòng refresh trang.');
      });

      return this.socket;
    } catch (error) {
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

  joinConversation(conversationId: string) {
    const join = (socket: Socket) => {
      if (socket && socket.connected) {
        socket.emit('join_conversation', conversationId);
        } else {
        }
    };

    const socket = this.getSocketSync();
    if (socket && socket.connected) {
      join(socket);
    } else {
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
      }).catch(() => {});
    }
  }

  leaveConversation(conversationId: string) {
    const socket = this.getSocketSync();
    if (socket) {
      socket.emit('leave_conversation', conversationId);
    }
  }

  private newMessageCallbacks: Set<(message: Message) => void> = new Set();

  onNewMessage(callback: (message: Message) => void) {
    this.newMessageCallbacks.add(callback);
    const setupListener = (socket: Socket) => {
      if (!socket) return;
      
      const handler = (message: Message) => {
        this.newMessageCallbacks.forEach(cb => {
          try {
            cb(message);
          } catch (error) {
            }
        });
      };
      
      socket.removeAllListeners('new_message');
      socket.on('new_message', handler);
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
      }).catch(() => {});
    }
  }

  offNewMessage(callback: (message: Message) => void) {
    this.newMessageCallbacks.delete(callback);
    const socket = this.getSocketSync();
    if (socket) {
      }
  }

  onConversationUpdated(callback: (data: { conversationId: string; message: Message }) => void) {
    const socket = this.getSocketSync();
    if (socket) {
      socket.on('conversation_updated', callback);
    } else {
      this.connect().then((socket) => {
        if (socket) {
          socket.on('conversation_updated', callback);
        }
      }).catch(() => {});
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
      }).catch(() => {});
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
        socket.emit('send_message', data);
      }
    };

    const socket = this.getSocketSync();
    if (socket && socket.connected) {
      send(socket);
    } else {
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
      }).catch(() => {});
    }
  }

  onUserTyping(callback: (data: { userId: string; conversationId: string; isTyping: boolean }) => void) {
    const socket = this.getSocketSync();
    if (socket) {
      socket.on('user_typing', callback);
    } else {
      this.connect().then((socket) => {
        if (socket) {
          socket.on('user_typing', callback);
        }
      }).catch(() => {});
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
      }).catch(() => {});
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
      }).catch(() => {});
    }
  }

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
      }).catch(() => {});
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
      }).catch(() => {});
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
      }).catch(() => {});
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
      }).catch(() => {});
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
      }).catch(() => {});
    }
  }

  offCallDecline(callback: (data: { conversationId: string; userId: string }) => void) {
    const socket = this.getSocketSync();
    if (socket) {
      socket.off('call_decline', callback);
    }
  }

  sendCallOffer(conversationId: string, callType: 'audio' | 'video', offer: RTCSessionDescriptionInit) {
    const socket = this.getSocketSync();
    if (socket && socket.connected) {
      socket.emit('call_offer', { conversationId, callType, offer });
    } else {
      this.connect().then((socket) => {
        if (socket && socket.connected) {
          socket.emit('call_offer', { conversationId, callType, offer });
        }
      }).catch(() => {});
    }
  }

  sendCallAnswer(conversationId: string, answer: RTCSessionDescriptionInit) {
    const socket = this.getSocketSync();
    if (socket && socket.connected) {
      socket.emit('call_answer', { conversationId, answer });
    } else {
      this.connect().then((socket) => {
        if (socket && socket.connected) {
          socket.emit('call_answer', { conversationId, answer });
        }
      }).catch(() => {});
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
      }).catch(() => {});
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
      }).catch(() => {});
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
      }).catch(() => {});
    }
  }

  onError(callback: (error: { message: string; conversationId?: string }) => void) {
    const socket = this.getSocketSync();
    if (socket) {
      socket.on('error', callback);
    } else {
      this.connect().then((socket) => {
        if (socket) {
          socket.on('error', callback);
        }
      }).catch(() => {});
    }
  }

  offError(callback: (error: { message: string; conversationId?: string }) => void) {
    const socket = this.getSocketSync();
    if (socket) {
      socket.off('error', callback);
    }
  }

  addReaction(messageId: string, emoji: string) {
    const socket = this.getSocketSync();
    if (socket) {
      socket.emit('add_reaction', { messageId, emoji });
    } else {
      this.connect().then((socket) => {
        if (socket) {
          socket.emit('add_reaction', { messageId, emoji });
        }
      }).catch(() => {});
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
      }).catch(() => {});
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
      }).catch(() => {});
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
      }).catch(() => {});
    }
  }

  offReactionRemoved(callback: (data: { messageId: string; userId: string; emoji: string }) => void) {
    const socket = this.getSocketSync();
    if (socket) {
      socket.off('reaction_removed', callback);
    }
  }

  editMessage(messageId: string, content: string) {
    const socket = this.getSocketSync();
    if (socket) {
      socket.emit('edit_message', { messageId, content });
    } else {
      this.connect().then((socket) => {
        if (socket) {
          socket.emit('edit_message', { messageId, content });
        }
      }).catch(() => {});
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
      }).catch(() => {});
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
      }).catch(() => {});
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
      }).catch(() => {});
    }
  }

  offMessageDeleted(callback: (data: { messageId: string }) => void) {
    const socket = this.getSocketSync();
    if (socket) {
      socket.off('message_deleted', callback);
    }
  }

  updateOnlineStatus(isOnline: boolean) {
    const socket = this.getSocketSync();
    if (socket) {
      socket.emit('update_online_status', { isOnline });
    } else {
      this.connect().then((socket) => {
        if (socket) {
          socket.emit('update_online_status', { isOnline });
        }
      }).catch(() => {});
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
      }).catch(() => {});
    }
  }

  offUserOnlineStatus(callback: (data: { userId: string; isOnline: boolean; lastSeen: string }) => void) {
    const socket = this.getSocketSync();
    if (socket) {
      socket.off('user_online_status', callback);
    }
  }

  addGroupMember(conversationId: string, userId: string) {
    const socket = this.getSocketSync();
    if (socket) {
      socket.emit('add_group_member', { conversationId, userId });
    } else {
      this.connect().then((socket) => {
        if (socket) {
          socket.emit('add_group_member', { conversationId, userId });
        }
      }).catch(() => {});
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
      }).catch(() => {});
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
      }).catch(() => {});
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
      }).catch(() => {});
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


import { Server as HttpServer } from 'http';
import { Server as SocketServer, Socket } from 'socket.io';
import { verifyToken } from '../utils/jwt';
import { chatService } from '../services/chat.service';
import { pushNotificationService } from '../services/push-notification.service';
import { supabaseAdmin } from '../config/supabase';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

export const initializeSocket = (httpServer: HttpServer) => {
  const io = new SocketServer(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      try {
        const decoded = verifyToken(token as string);
        socket.userId = decoded.id;
        next();
      } catch (error) {
        return next(new Error('Authentication error: Invalid token'));
      }
    } catch (error) {
      return next(new Error('Authentication error'));
    }
  });

  const userSockets = new Map<string, Set<string>>(); // userId -> Set of socketIds

  io.on('connection', (socket: AuthenticatedSocket) => {
    const userId = socket.userId!;

    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set());
    }
    userSockets.get(userId)!.add(socket.id);

    socket.join(`user:${userId}`);

    chatService.getUserConversations(userId).then((conversations) => {
      conversations.forEach((conv) => {
        socket.join(`conversation:${conv.id}`);
      });
    }).catch(() => {});

    socket.on('join_conversation', async (conversationId: string) => {
      try {
        const { data: participant, error } = await supabaseAdmin
          .from('conversation_participants')
          .select('user_id')
          .eq('conversation_id', conversationId)
          .eq('user_id', userId)
          .maybeSingle();

        if (error) {
          return;
        }

        if (!participant) {
          return;
        }

        socket.join(`conversation:${conversationId}`);
      } catch (error: any) {
        // Error handling
      }
    });

    socket.on('leave_conversation', (conversationId: string) => {
      socket.leave(`conversation:${conversationId}`);
    });

    socket.on('send_message', async (data: {
      conversationId: string;
      messageType: 'text' | 'image' | 'audio' | 'video' | 'sticker' | 'gif' | 'file';
      content?: string;
      fileUrl?: string;
      fileName?: string;
      fileSize?: number;
      replyToId?: string;
    }) => {
      try {
        if (!socket.rooms.has(`conversation:${data.conversationId}`)) {
          socket.join(`conversation:${data.conversationId}`);
        }

        const message = await chatService.sendMessage(
          data.conversationId,
          userId,
          data.messageType,
          data.content,
          data.fileUrl,
          data.fileName,
          data.fileSize,
          data.replyToId
        );

        await chatService.markAsRead(data.conversationId, userId);

        const conversation = await chatService.getConversationById(data.conversationId, userId);
        
        const senderName = message.sender?.first_name || 'Someone';
        let notificationBody = '';
        
        if (message.message_type === 'image') {
          notificationBody = '📷 sent an image';
        } else if (message.message_type === 'audio') {
          notificationBody = '🎤 sent an audio';
        } else if (message.message_type === 'video') {
          notificationBody = '🎥 sent a video';
        } else if (message.message_type === 'sticker') {
          notificationBody = '🎨 sent a sticker';
        } else if (message.message_type === 'gif') {
          notificationBody = '🎬 sent a GIF';
        } else {
          notificationBody = message.content || 'sent a message';
          if (notificationBody.length > 50) {
            notificationBody = notificationBody.substring(0, 50) + '...';
          }
        }
        
        const conversationRoom = io.sockets.adapter.rooms.get(`conversation:${data.conversationId}`);
        const userRooms = new Set<string>();
        
        for (const participant of conversation.participants || []) {
          userRooms.add(`user:${participant.user_id}`);
        }
        
        // Emit to conversation room for all participants in the room
        io.to(`conversation:${data.conversationId}`).emit('new_message', message);
        
        // Also emit to each participant's user room for reliable delivery
        for (const participant of conversation.participants || []) {
          // Always emit to user room for reliable delivery
          io.to(`user:${participant.user_id}`).emit('new_message', message);
          
          if (participant.user_id === userId) {
            // Sender gets confirmation
            io.to(`user:${participant.user_id}`).emit('message_sent', { messageId: message.id });
          } else {
            // Other participants get conversation update notification
            io.to(`user:${participant.user_id}`).emit('conversation_updated', {
              conversationId: data.conversationId,
              message,
            });
            
            // Send push notification
            pushNotificationService.sendNotification(
              participant.user_id,
              senderName,
              notificationBody,
              {
                conversationId: data.conversationId,
                messageId: message.id,
                type: 'new_message',
              }
            ).catch(() => {});
          }
        }
      } catch (error: any) {
        socket.emit('error', { message: error.message || 'Failed to send message' });
      }
    });

    socket.on('typing_start', (data: { conversationId: string }) => {
      socket.to(`conversation:${data.conversationId}`).emit('user_typing', {
        userId,
        conversationId: data.conversationId,
        isTyping: true,
      });
    });

    socket.on('typing_stop', (data: { conversationId: string }) => {
      socket.to(`conversation:${data.conversationId}`).emit('user_typing', {
        userId,
        conversationId: data.conversationId,
        isTyping: false,
      });
    });

    socket.on('call_offer', async (data: {
      conversationId: string;
      callType: 'audio' | 'video';
      offer: any; // RTCSessionDescriptionInit
    }) => {
      try {
        const { data: participant } = await supabaseAdmin
          .from('conversation_participants')
          .select('user_id')
          .eq('conversation_id', data.conversationId)
          .eq('user_id', userId)
          .maybeSingle();

        if (!participant) {
          socket.emit('error', { 
            message: 'Not a participant in this conversation',
            conversationId: data.conversationId 
          });
          return;
        }

        if (!socket.rooms.has(`conversation:${data.conversationId}`)) {
          socket.join(`conversation:${data.conversationId}`);
        }
        
        const conversation = await chatService.getConversationById(data.conversationId, userId);
        
        const { data: callerData } = await supabaseAdmin
          .from('users')
          .select('id, first_name, last_name, avatar_url')
          .eq('id', userId)
          .single();

        conversation.participants?.forEach((participant) => {
          if (participant.user_id !== userId) {
            const callOfferData = {
              conversationId: data.conversationId,
              callType: data.callType,
              offer: data.offer,
              callerId: userId,
              caller: callerData || null, // Include caller info
            };
            
            io.to(`user:${participant.user_id}`).emit('call_offer', callOfferData);
            io.to(`conversation:${data.conversationId}`).emit('call_offer', callOfferData);
          }
        });

        await chatService.saveCallHistory(
          data.conversationId,
          userId,
          data.callType,
          'missed', // Will be updated when answered
          new Date().toISOString()
        );
      } catch (error) {
        socket.emit('error', { message: 'Failed to initiate call' });
      }
    });

    socket.on('call_answer', async (data: {
      conversationId: string;
      answer: any; // RTCSessionDescriptionInit
    }) => {
      try {
        const conversation = await chatService.getConversationById(data.conversationId, userId);
        
        io.to(`conversation:${data.conversationId}`).emit('call_answer', {
          conversationId: data.conversationId,
          answer: data.answer,
          userId,
        });
        
        conversation.participants?.forEach((participant) => {
          if (participant.user_id !== userId) {
            io.to(`user:${participant.user_id}`).emit('call_answer', {
              conversationId: data.conversationId,
              answer: data.answer,
              userId,
            });
          }
        });
        
        await chatService.saveCallHistory(
          data.conversationId,
          userId,
          'audio', // Default, will be updated when call ends
          'answered',
          new Date().toISOString()
        ).catch(() => {});
      } catch (error) {
        socket.emit('error', { message: 'Failed to process call answer' });
      }
    });

    socket.on('call_ice_candidate', async (data: {
      conversationId: string;
      candidate: any; // RTCIceCandidateInit
    }) => {
      socket.to(`conversation:${data.conversationId}`).emit('call_ice_candidate', {
        conversationId: data.conversationId,
        candidate: data.candidate,
        userId,
      });
      
      // Also emit to user rooms for reliability
      try {
        const conversation = await chatService.getConversationById(data.conversationId, userId);
        if (conversation) {
          conversation.participants?.forEach((participant) => {
            if (participant.user_id !== userId) {
              io.to(`user:${participant.user_id}`).emit('call_ice_candidate', {
                conversationId: data.conversationId,
                candidate: data.candidate,
                userId,
              });
            }
          });
        }
      } catch (error) {
      }
    });

    const callEndTracking = new Map<string, { userId: string; timestamp: number }>();
    
    socket.on('call_end', async (data: {
      conversationId: string;
      callType: 'audio' | 'video';
      duration?: number;
    }) => {
      const duration = data.duration || 0;
      const callKey = `${data.conversationId}-${data.callType}`;
      const now = Date.now();
      
      const existing = callEndTracking.get(callKey);
      if (existing && now - existing.timestamp < 2000) {
        io.to(`conversation:${data.conversationId}`).emit('call_end', {
          conversationId: data.conversationId,
          userId,
        });
        return;
      }
      
      callEndTracking.set(callKey, { userId, timestamp: now });
      setTimeout(() => {
        callEndTracking.delete(callKey);
      }, 5000);
      
      await chatService.saveCallHistory(
        data.conversationId,
        userId,
        data.callType,
        'answered', // Could be updated based on status
        new Date(Date.now() - duration * 1000).toISOString(),
        new Date().toISOString(),
        duration
      ).catch(() => {});

      if (duration > 0) {
        try {
          const hours = Math.floor(duration / 3600);
          const minutes = Math.floor((duration % 3600) / 60);
          const seconds = duration % 60;
          
          let durationText = '';
          if (hours > 0) {
            durationText = `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
          } else {
            durationText = `${minutes}:${seconds.toString().padStart(2, '0')}`;
          }
          
          const callEmoji = data.callType === 'video' ? '📹' : '📞';
          const callTypeText = data.callType === 'video' ? 'Video call' : 'Audio call';
          
          const message = await chatService.sendMessage(
            data.conversationId,
            userId,
            'text',
            `${callEmoji} ${callTypeText} ended. Duration: ${durationText}`
          );
          
          io.to(`conversation:${data.conversationId}`).emit('new_message', message);
          const conversation = await chatService.getConversationById(data.conversationId, userId);
          for (const participant of conversation.participants || []) {
            io.to(`user:${participant.user_id}`).emit('new_message', message);
            io.to(`user:${participant.user_id}`).emit('conversation_updated', {
              conversationId: data.conversationId,
              message,
            });
          }
        } catch (error) {
          }
      }

      io.to(`conversation:${data.conversationId}`).emit('call_end', {
        conversationId: data.conversationId,
        userId,
      });
    });

    socket.on('call_decline', async (data: {
      conversationId: string;
      callType: 'audio' | 'video';
    }) => {
      try {
        const conversation = await chatService.getConversationById(data.conversationId, userId);
        
        io.to(`conversation:${data.conversationId}`).emit('call_decline', {
          conversationId: data.conversationId,
          userId,
        });
        
        conversation.participants?.forEach((participant) => {
          if (participant.user_id !== userId) {
            io.to(`user:${participant.user_id}`).emit('call_decline', {
              conversationId: data.conversationId,
              userId,
            });
          }
        });

        conversation.participants?.forEach(async (participant) => {
          if (participant.user_id !== userId) {
            await chatService.saveCallHistory(
              data.conversationId,
              participant.user_id,
              data.callType,
              'declined',
              new Date().toISOString()
            ).catch(() => {});
          }
        });
      } catch (error) {
        socket.emit('error', { message: 'Failed to process call decline' });
      }
    });

    socket.on('add_reaction', async (data: { messageId: string; emoji: string }) => {
      try {
        await chatService.addReaction(data.messageId, userId, data.emoji);
        const { data: message } = await supabaseAdmin
          .from('messages')
          .select('conversation_id')
          .eq('id', data.messageId)
          .single();
        
        if (message) {
          io.to(`conversation:${message.conversation_id}`).emit('reaction_added', {
            messageId: data.messageId,
            userId,
            emoji: data.emoji,
          });
        }
      } catch (error: any) {
        socket.emit('error', { message: error.message || 'Failed to add reaction' });
      }
    });

    socket.on('remove_reaction', async (data: { messageId: string; emoji: string }) => {
      try {
        await chatService.removeReaction(data.messageId, userId, data.emoji);
        const { data: message } = await supabaseAdmin
          .from('messages')
          .select('conversation_id')
          .eq('id', data.messageId)
          .single();
        
        if (message) {
          io.to(`conversation:${message.conversation_id}`).emit('reaction_removed', {
            messageId: data.messageId,
            userId,
            emoji: data.emoji,
          });
        }
      } catch (error: any) {
        socket.emit('error', { message: error.message || 'Failed to remove reaction' });
      }
    });

    socket.on('edit_message', async (data: { messageId: string; content: string }) => {
      try {
        const message = await chatService.editMessage(data.messageId, userId, data.content);
        io.to(`conversation:${message.conversation_id}`).emit('message_edited', message);
      } catch (error: any) {
        socket.emit('error', { message: error.message || 'Failed to edit message' });
      }
    });

    socket.on('delete_message', async (data: { messageId: string }) => {
      try {
        const { data: message } = await supabaseAdmin
          .from('messages')
          .select('conversation_id')
          .eq('id', data.messageId)
          .single();
        
        if (message) {
          await chatService.deleteMessage(data.messageId, userId);
          io.to(`conversation:${message.conversation_id}`).emit('message_deleted', {
            messageId: data.messageId,
          });
        }
      } catch (error: any) {
        socket.emit('error', { message: error.message || 'Failed to delete message' });
      }
    });

    socket.on('update_online_status', async (data: { isOnline: boolean }) => {
      try {
        await chatService.updateOnlineStatus(userId, data.isOnline);
        chatService.getUserConversations(userId).then((conversations) => {
          conversations.forEach((conv) => {
            io.to(`conversation:${conv.id}`).emit('user_online_status', {
              userId,
              isOnline: data.isOnline,
              lastSeen: new Date().toISOString(),
            });
          });
        }).catch(() => {});
      } catch (error: any) {
        socket.emit('error', { message: error.message || 'Failed to update status' });
      }
    });

    socket.on('add_group_member', async (data: { conversationId: string; userId: string }) => {
      try {
        await chatService.addGroupMember(data.conversationId, data.userId, userId);
        const conversation = await chatService.getConversationById(data.conversationId, userId);
        io.to(`conversation:${data.conversationId}`).emit('member_added', {
          conversationId: data.conversationId,
          userId: data.userId,
          conversation,
        });
      } catch (error: any) {
        socket.emit('error', { message: error.message || 'Failed to add member' });
      }
    });

    socket.on('remove_group_member', async (data: { conversationId: string; userId: string }) => {
      try {
        await chatService.removeGroupMember(data.conversationId, data.userId, userId);
        io.to(`conversation:${data.conversationId}`).emit('member_removed', {
          conversationId: data.conversationId,
          userId: data.userId,
        });
      } catch (error: any) {
        socket.emit('error', { message: error.message || 'Failed to remove member' });
      }
    });

    socket.on('disconnect', async (reason) => {
      const sockets = userSockets.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          userSockets.delete(userId);
          await chatService.updateOnlineStatus(userId, false).catch(() => {});
          chatService.getUserConversations(userId).then((conversations) => {
            conversations.forEach((conv) => {
              io.to(`conversation:${conv.id}`).emit('user_online_status', {
                userId,
                isOnline: false,
                lastSeen: new Date().toISOString(),
              });
            });
          }).catch(() => {});
        }
      }
    });
  });

  return io;
};


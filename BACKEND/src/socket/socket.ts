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

  // Middleware for authentication
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

  // Store user socket connections
  const userSockets = new Map<string, Set<string>>(); // userId -> Set of socketIds

  io.on('connection', (socket: AuthenticatedSocket) => {
    const userId = socket.userId!;
    console.log(`✅ User connected: ${userId} (socket: ${socket.id})`);

    // Track user socket
    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set());
    }
    userSockets.get(userId)!.add(socket.id);

    // Join user's personal room
    socket.join(`user:${userId}`);

    // Get user conversations and join their rooms automatically
    chatService.getUserConversations(userId).then((conversations) => {
      console.log(`📥 Auto-joining ${conversations.length} conversations for user ${userId}`);
      conversations.forEach((conv) => {
        socket.join(`conversation:${conv.id}`);
        console.log(`✅ Auto-joined conversation: ${conv.id}`);
      });
    }).catch((error) => {
      console.error('Error joining conversation rooms:', error);
    });

    // Handle joining conversation room
    socket.on('join_conversation', async (conversationId: string) => {
      try {
        // Verify user is participant by checking directly
        const { data: participant, error } = await supabaseAdmin
          .from('conversation_participants')
          .select('user_id')
          .eq('conversation_id', conversationId)
          .eq('user_id', userId)
          .maybeSingle();

        if (error) {
          console.error(`❌ Error checking participant: ${error.message}`);
          // Don't emit error for join - just log it
          return;
        }

        if (!participant) {
          console.warn(`⚠️ User ${userId} is not a participant in conversation ${conversationId} - skipping join`);
          // Don't emit error - just skip joining (user might be trying to join before being added)
          return;
        }

        // Join the room
        socket.join(`conversation:${conversationId}`);
        console.log(`✅ User ${userId} joined conversation ${conversationId}`);
      } catch (error: any) {
        console.error(`❌ Error joining conversation ${conversationId}:`, error);
        // Don't emit error for join failures - they're not critical
      }
    });

    // Handle leaving conversation room
    socket.on('leave_conversation', (conversationId: string) => {
      socket.leave(`conversation:${conversationId}`);
      console.log(`👋 User ${userId} left conversation ${conversationId}`);
    });

    // Handle sending message
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
        // Ensure user is in the conversation room
        if (!socket.rooms.has(`conversation:${data.conversationId}`)) {
          socket.join(`conversation:${data.conversationId}`);
          console.log(`✅ Auto-joined user ${userId} to conversation ${data.conversationId}`);
        }

        // Send message - chatService will verify participant
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

        // Mark conversation as read for sender
        await chatService.markAsRead(data.conversationId, userId);

        // Get conversation to find all participants
        const conversation = await chatService.getConversationById(data.conversationId, userId);
        
        // Prepare notification content
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
        
        // Get all sockets in conversation room
        const conversationRoom = io.sockets.adapter.rooms.get(`conversation:${data.conversationId}`);
        const userRooms = new Set<string>();
        
        // Collect all user rooms for participants
        for (const participant of conversation.participants || []) {
          userRooms.add(`user:${participant.user_id}`);
        }
        
        console.log(`📤 Broadcasting message to conversation:${data.conversationId}`);
        console.log(`📤 Conversation room has ${conversationRoom?.size || 0} sockets`);
        console.log(`📤 Participants: ${conversation.participants?.map(p => p.user_id).join(', ')}`);
        
        // Emit to conversation room (all participants who joined the room)
        io.to(`conversation:${data.conversationId}`).emit('new_message', message);
        console.log(`✅ Emitted new_message to conversation:${data.conversationId} room`);
        
        // Also emit to each participant's personal room (guaranteed delivery)
        // This ensures delivery even if they haven't joined the conversation room yet
        for (const participant of conversation.participants || []) {
          // Emit to sender for confirmation
          if (participant.user_id === userId) {
            io.to(`user:${participant.user_id}`).emit('new_message', message);
            io.to(`user:${participant.user_id}`).emit('message_sent', { messageId: message.id });
            console.log(`✅ Emitted new_message to user:${participant.user_id} (sender)`);
          } else {
            // Emit to receiver - use both user room and conversation room for reliability
            io.to(`user:${participant.user_id}`).emit('new_message', message);
            io.to(`user:${participant.user_id}`).emit('conversation_updated', {
              conversationId: data.conversationId,
              message,
            });
            console.log(`✅ Emitted new_message to user:${participant.user_id} (receiver)`);
            
            // Send push notification (works even when online but in different tab)
            pushNotificationService.sendNotification(
              participant.user_id,
              senderName,
              notificationBody,
              {
                conversationId: data.conversationId,
                messageId: message.id,
                type: 'new_message',
              }
            ).catch(console.error);
          }
        }
      } catch (error: any) {
        console.error('Error sending message:', error);
        socket.emit('error', { message: error.message || 'Failed to send message' });
      }
    });

    // Handle typing indicator
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

    // Handle call signaling (WebRTC)
    socket.on('call_offer', async (data: {
      conversationId: string;
      callType: 'audio' | 'video';
      offer: any; // RTCSessionDescriptionInit
    }) => {
      try {
        console.log(`📞 Call offer from ${userId} to conversation ${data.conversationId}`);
        
        // Verify user is participant
        const { data: participant } = await supabaseAdmin
          .from('conversation_participants')
          .select('user_id')
          .eq('conversation_id', data.conversationId)
          .eq('user_id', userId)
          .maybeSingle();

        if (!participant) {
          console.error(`User ${userId} tried to call but is not a participant in conversation ${data.conversationId}`);
          socket.emit('error', { 
            message: 'Not a participant in this conversation',
            conversationId: data.conversationId 
          });
          return;
        }

        // Ensure user is in the conversation room
        if (!socket.rooms.has(`conversation:${data.conversationId}`)) {
          socket.join(`conversation:${data.conversationId}`);
          console.log(`✅ Auto-joined user ${userId} to conversation ${data.conversationId}`);
        }
        
        // Get conversation participants
        const conversation = await chatService.getConversationById(data.conversationId, userId);
        
        // Get caller info
        const { data: callerData } = await supabaseAdmin
          .from('users')
          .select('id, first_name, last_name, avatar_url')
          .eq('id', userId)
          .single();

        console.log(`📞 Caller info:`, callerData);
        console.log(`📞 Participants:`, conversation.participants?.map(p => p.user_id));

        conversation.participants?.forEach((participant) => {
          if (participant.user_id !== userId) {
            const callOfferData = {
              conversationId: data.conversationId,
              callType: data.callType,
              offer: data.offer,
              callerId: userId,
              caller: callerData || null, // Include caller info
            };
            
            console.log(`📤 Emitting call_offer to user:${participant.user_id}`, callOfferData);
            
            // Emit to user's personal room so they receive it even if not in conversation
            io.to(`user:${participant.user_id}`).emit('call_offer', callOfferData);
            
            // Also emit to conversation room as backup
            io.to(`conversation:${data.conversationId}`).emit('call_offer', callOfferData);
          }
        });

        // Save call history
        await chatService.saveCallHistory(
          data.conversationId,
          userId,
          data.callType,
          'missed', // Will be updated when answered
          new Date().toISOString()
        );
      } catch (error) {
        console.error('Error handling call offer:', error);
        socket.emit('error', { message: 'Failed to initiate call' });
      }
    });

    socket.on('call_answer', async (data: {
      conversationId: string;
      answer: any; // RTCSessionDescriptionInit
    }) => {
      try {
        console.log(`📞 Call answer from ${userId} for conversation ${data.conversationId}`);
        
        // Get conversation to find caller
        const conversation = await chatService.getConversationById(data.conversationId, userId);
        
        // Emit to conversation room (all participants)
        io.to(`conversation:${data.conversationId}`).emit('call_answer', {
          conversationId: data.conversationId,
          answer: data.answer,
          userId,
        });
        
        // Also emit to caller's personal room to ensure delivery
        conversation.participants?.forEach((participant) => {
          if (participant.user_id !== userId) {
            io.to(`user:${participant.user_id}`).emit('call_answer', {
              conversationId: data.conversationId,
              answer: data.answer,
              userId,
            });
          }
        });
        
        // Update call history status to answered
        await chatService.saveCallHistory(
          data.conversationId,
          userId,
          'audio', // Default, will be updated when call ends
          'answered',
          new Date().toISOString()
        ).catch(() => {});
      } catch (error) {
        console.error('Error handling call answer:', error);
        socket.emit('error', { message: 'Failed to process call answer' });
      }
    });

    socket.on('call_ice_candidate', (data: {
      conversationId: string;
      candidate: any; // RTCIceCandidateInit
    }) => {
      socket.to(`conversation:${data.conversationId}`).emit('call_ice_candidate', {
        conversationId: data.conversationId,
        candidate: data.candidate,
        userId,
      });
    });

    // Track call end events to prevent duplicate messages
    const callEndTracking = new Map<string, { userId: string; timestamp: number }>();
    
    socket.on('call_end', async (data: {
      conversationId: string;
      callType: 'audio' | 'video';
      duration?: number;
    }) => {
      const duration = data.duration || 0;
      const callKey = `${data.conversationId}-${data.callType}`;
      const now = Date.now();
      
      // Check if call end was already processed (within last 2 seconds)
      const existing = callEndTracking.get(callKey);
      if (existing && now - existing.timestamp < 2000) {
        console.log('⚠️ Call end already processed, skipping message creation');
        // Still emit call_end event
        io.to(`conversation:${data.conversationId}`).emit('call_end', {
          conversationId: data.conversationId,
          userId,
        });
        return;
      }
      
      // Track this call end
      callEndTracking.set(callKey, { userId, timestamp: now });
      // Clean up after 5 seconds
      setTimeout(() => {
        callEndTracking.delete(callKey);
      }, 5000);
      
      // Update call history
      await chatService.saveCallHistory(
        data.conversationId,
        userId,
        data.callType,
        'answered', // Could be updated based on status
        new Date(Date.now() - duration * 1000).toISOString(),
        new Date().toISOString(),
        duration
      ).catch(() => {});

      // Send call summary message if call lasted more than 0 seconds
      // Only send once (from the person who ended the call with duration > 0)
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
          
          // Create call summary message
          const message = await chatService.sendMessage(
            data.conversationId,
            userId,
            'text',
            `${callEmoji} ${callTypeText} ended. Duration: ${durationText}`
          );
          
          // Emit message to conversation
          io.to(`conversation:${data.conversationId}`).emit('new_message', message);
          console.log(`📤 Emitted call summary message to conversation:${data.conversationId}`);
          
          // Also emit to each participant's personal room
          const conversation = await chatService.getConversationById(data.conversationId, userId);
          for (const participant of conversation.participants || []) {
            io.to(`user:${participant.user_id}`).emit('new_message', message);
            io.to(`user:${participant.user_id}`).emit('conversation_updated', {
              conversationId: data.conversationId,
              message,
            });
          }
        } catch (error) {
          console.error('Failed to send call summary message:', error);
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
        console.log(`📞 Call declined by ${userId} for conversation ${data.conversationId}`);
        
        // Get conversation to find caller
        const conversation = await chatService.getConversationById(data.conversationId, userId);
        
        // Emit to conversation room
        io.to(`conversation:${data.conversationId}`).emit('call_decline', {
          conversationId: data.conversationId,
          userId,
        });
        
        // Also emit to caller's personal room to ensure delivery
        conversation.participants?.forEach((participant) => {
          if (participant.user_id !== userId) {
            io.to(`user:${participant.user_id}`).emit('call_decline', {
              conversationId: data.conversationId,
              userId,
            });
          }
        });

        // Update call history - find the caller (the one who initiated)
        conversation.participants?.forEach(async (participant) => {
          if (participant.user_id !== userId) {
            // This is the caller, update their call history
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
        console.error('Error handling call decline:', error);
        socket.emit('error', { message: 'Failed to process call decline' });
      }
    });

    // Handle message reaction
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

    // Handle edit message
    socket.on('edit_message', async (data: { messageId: string; content: string }) => {
      try {
        const message = await chatService.editMessage(data.messageId, userId, data.content);
        io.to(`conversation:${message.conversation_id}`).emit('message_edited', message);
      } catch (error: any) {
        socket.emit('error', { message: error.message || 'Failed to edit message' });
      }
    });

    // Handle delete message
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

    // Handle online status updates
    socket.on('update_online_status', async (data: { isOnline: boolean }) => {
      try {
        await chatService.updateOnlineStatus(userId, data.isOnline);
        // Broadcast to user's conversations
        chatService.getUserConversations(userId).then((conversations) => {
          conversations.forEach((conv) => {
            io.to(`conversation:${conv.id}`).emit('user_online_status', {
              userId,
              isOnline: data.isOnline,
              lastSeen: new Date().toISOString(),
            });
          });
        }).catch(console.error);
      } catch (error: any) {
        socket.emit('error', { message: error.message || 'Failed to update status' });
      }
    });

    // Handle group member management
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

    // Handle disconnect
    socket.on('disconnect', async () => {
      console.log(`👋 User disconnected: ${userId} (socket: ${socket.id})`);

      // Remove socket from user's socket set
      const sockets = userSockets.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          userSockets.delete(userId);
          // Update online status to offline
          await chatService.updateOnlineStatus(userId, false).catch(console.error);
          // Broadcast offline status
          chatService.getUserConversations(userId).then((conversations) => {
            conversations.forEach((conv) => {
              io.to(`conversation:${conv.id}`).emit('user_online_status', {
                userId,
                isOnline: false,
                lastSeen: new Date().toISOString(),
              });
            });
          }).catch(console.error);
        }
      }
    });
  });

  return io;
};


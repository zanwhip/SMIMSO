import { supabaseAdmin } from '../config/supabase';
import { v4 as uuidv4 } from 'uuid';

export interface Conversation {
  id: string;
  type: 'direct' | 'group';
  name?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  last_message_at?: string;
  participants?: Participant[];
  unread_count?: number;
}

export interface Participant {
  id: string;
  conversation_id: string;
  user_id: string;
  joined_at: string;
  last_read_at?: string;
  user?: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url?: string;
  };
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  message_type: 'text' | 'image' | 'audio' | 'video' | 'sticker' | 'gif' | 'file';
  content?: string;
  file_url?: string;
  file_name?: string;
  file_size?: number;
  reply_to_id?: string;
  is_edited: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  sender?: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url?: string;
  };
  reply_to?: Message;
}

export interface CallHistory {
  id: string;
  conversation_id: string;
  caller_id: string;
  call_type: 'audio' | 'video';
  status: 'missed' | 'answered' | 'declined' | 'cancelled';
  started_at: string;
  ended_at?: string;
  duration?: number;
}

export class ChatService {
  // Get or create direct conversation between two users
  async getOrCreateDirectConversation(user1Id: string, user2Id: string): Promise<Conversation> {
    if (user1Id === user2Id) {
      throw new Error('Cannot create conversation with yourself');
    }

    // Check if direct conversation already exists
    const { data: existingConversations, error: fetchError } = await supabaseAdmin
      .from('conversations')
      .select('id, type')
      .eq('type', 'direct');

    if (fetchError) throw fetchError;

    // Find conversation with both users
    for (const conv of existingConversations || []) {
      const { data: participants } = await supabaseAdmin
        .from('conversation_participants')
        .select('user_id')
        .eq('conversation_id', conv.id);

      const participantIds = participants?.map(p => p.user_id) || [];
      if (participantIds.includes(user1Id) && participantIds.includes(user2Id) && participantIds.length === 2) {
        return await this.getConversationById(conv.id, user1Id);
      }
    }

    // Create new direct conversation
    const conversationId = uuidv4();
    const now = new Date().toISOString();
    
    // Insert conversation
    const { error: convError } = await supabaseAdmin
      .from('conversations')
      .insert({
        id: conversationId,
        type: 'direct',
        created_by: user1Id,
      });

    if (convError) {
      console.error('Error creating conversation:', convError);
      throw convError;
    }

    // Insert both participants - insert separately to handle errors better
    const { error: participant1Error } = await supabaseAdmin
      .from('conversation_participants')
      .insert({
        conversation_id: conversationId,
        user_id: user1Id,
        joined_at: now
      });

    if (participant1Error) {
      console.error('Error adding participant 1:', participant1Error);
      await supabaseAdmin.from('conversations').delete().eq('id', conversationId);
      throw new Error('Failed to add participants to conversation');
    }

    const { error: participant2Error } = await supabaseAdmin
      .from('conversation_participants')
      .insert({
        conversation_id: conversationId,
        user_id: user2Id,
        joined_at: now
      });

    if (participant2Error) {
      console.error('Error adding participant 2:', participant2Error);
      // Try to clean up participant 1
      await supabaseAdmin.from('conversation_participants').delete().eq('conversation_id', conversationId).eq('user_id', user1Id);
      await supabaseAdmin.from('conversations').delete().eq('id', conversationId);
      throw new Error('Failed to add participants to conversation');
    }

    // Verify both participants were added
    const { data: verifyParticipants, error: verifyError } = await supabaseAdmin
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', conversationId);

    if (verifyError) {
      console.error('Error verifying participants:', verifyError);
      throw new Error('Failed to verify conversation participants');
    }

    const participantIds = verifyParticipants?.map(p => p.user_id) || [];
    if (!participantIds.includes(user1Id) || !participantIds.includes(user2Id)) {
      console.error('Participants verification failed. Expected:', [user1Id, user2Id], 'Got:', participantIds);
      throw new Error('Failed to create conversation participants');
    }

    // Return conversation with full participant data
    return await this.getConversationById(conversationId, user1Id);
  }

  // Create group conversation
  async createGroupConversation(name: string, createdBy: string, participantIds: string[]): Promise<Conversation> {
    if (!participantIds.includes(createdBy)) {
      participantIds.push(createdBy);
    }

    if (participantIds.length < 2) {
      throw new Error('Group must have at least 2 participants');
    }

    const conversationId = uuidv4();
    const { error: convError } = await supabaseAdmin
      .from('conversations')
      .insert({
        id: conversationId,
        type: 'group',
        name,
        created_by: createdBy,
      });

    if (convError) throw convError;

    // Add participants
    const participants = participantIds.map(userId => ({
      conversation_id: conversationId,
      user_id: userId,
    }));

    await supabaseAdmin
      .from('conversation_participants')
      .insert(participants);

    return await this.getConversationById(conversationId, createdBy);
  }

  // Get conversation by ID
  async getConversationById(conversationId: string, userId: string): Promise<Conversation> {
    // Get conversation
    const { data: conversation, error: convError } = await supabaseAdmin
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (convError || !conversation) {
      throw new Error('Conversation not found');
    }

    // Get all participants first
    const { data: allParticipants, error: participantsError } = await supabaseAdmin
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', conversationId);

    if (participantsError) {
      console.error('Error fetching participants:', participantsError);
      throw new Error('Failed to fetch conversation participants');
    }

    const participantIds = allParticipants?.map(p => p.user_id) || [];
    const isParticipant = participantIds.includes(userId);

    // For direct conversations, if user is not participant but conversation exists
    // and has participants, check if user should be one of them
    if (!isParticipant && conversation.type === 'direct') {
      // If conversation has participants but user is not one, check if we should add them
      if (participantIds.length > 0 && participantIds.length < 2) {
        // Only one participant - add the missing user
        try {
          await supabaseAdmin
            .from('conversation_participants')
            .insert({
              conversation_id: conversationId,
              user_id: userId,
              joined_at: new Date().toISOString()
            });
          console.log(`✅ Auto-added user ${userId} as participant to direct conversation ${conversationId}`);
          // Reload participants
          const { data: reloaded } = await supabaseAdmin
            .from('conversation_participants')
            .select('user_id')
            .eq('conversation_id', conversationId);
          if (reloaded) {
            participantIds.push(userId);
          }
        } catch (addError: any) {
          // If unique constraint violation, user might have been added by another request
          if (addError?.code === '23505') {
            console.log(`User ${userId} already added as participant (race condition)`);
          } else {
            console.error('Failed to add participant:', addError);
            // Don't throw - continue to check if user is now a participant
          }
        }
      } else if (participantIds.length === 0) {
        // No participants at all - this is an error state
        // If user is the creator, add them
        if (conversation.created_by === userId) {
          try {
            await supabaseAdmin
              .from('conversation_participants')
              .insert({
                conversation_id: conversationId,
                user_id: userId,
                joined_at: new Date().toISOString()
              });
            participantIds.push(userId);
          } catch (error) {
            console.error('Failed to add creator as participant:', error);
          }
        }
      } else if (participantIds.length === 2) {
        // Has 2 participants but user is not one - access denied
        throw new Error('Conversation not found or access denied');
      }
    } else if (!isParticipant) {
      // For group conversations, strict check
      throw new Error('Conversation not found or access denied');
    }

    // Get participants with user info (reload to get updated list)
    const { data: participants, error: fetchParticipantsError } = await supabaseAdmin
      .from('conversation_participants')
      .select(`
        id,
        conversation_id,
        user_id,
        joined_at,
        last_read_at,
        users:user_id (
          id,
          first_name,
          last_name,
          avatar_url
        )
      `)
      .eq('conversation_id', conversationId);

    if (fetchParticipantsError) {
      console.error('Error fetching participants:', fetchParticipantsError);
      throw fetchParticipantsError;
    }

    // Get unread count
    const { data: lastRead } = await supabaseAdmin
      .from('conversation_participants')
      .select('last_read_at')
      .eq('conversation_id', conversationId)
      .eq('user_id', userId)
      .single();

    let unreadCount = 0;
    if (lastRead?.last_read_at) {
      const { count } = await supabaseAdmin
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', conversationId)
        .gt('created_at', lastRead.last_read_at)
        .neq('sender_id', userId);

      unreadCount = count || 0;
    } else {
      const { count } = await supabaseAdmin
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', conversationId)
        .neq('sender_id', userId);

      unreadCount = count || 0;
    }

    return {
      ...conversation,
      participants: participants?.map((p: any) => ({
        ...p,
        user: p.users,
      })) || [],
      unread_count: unreadCount,
    } as Conversation;
  }

  // Get user conversations
  async getUserConversations(userId: string): Promise<Conversation[]> {
    const { data: participantConversations, error } = await supabaseAdmin
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', userId);

    if (error) throw error;

    const conversationIds = participantConversations?.map(p => p.conversation_id) || [];

    if (conversationIds.length === 0) {
      return [];
    }

    const { data: conversations, error: convError } = await supabaseAdmin
      .from('conversations')
      .select('*')
      .in('id', conversationIds)
      .order('last_message_at', { ascending: false, nullsFirst: false });

    if (convError) throw convError;

    // Get participants and unread counts for each conversation
    const conversationsWithDetails = await Promise.all(
      (conversations || []).map(conv => this.getConversationById(conv.id, userId))
    );

    return conversationsWithDetails;
  }

  // Send message
  async sendMessage(
    conversationId: string,
    senderId: string,
    messageType: Message['message_type'],
    content?: string,
    fileUrl?: string,
    fileName?: string,
    fileSize?: number,
    replyToId?: string
  ): Promise<Message> {
    // Get conversation first to check type
    const { data: conversation, error: convError } = await supabaseAdmin
      .from('conversations')
      .select('id, type')
      .eq('id', conversationId)
      .single();

    if (convError || !conversation) {
      throw new Error('Conversation not found');
    }

    // Verify user is participant
    const { data: participant, error: participantError } = await supabaseAdmin
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', conversationId)
      .eq('user_id', senderId)
      .maybeSingle();

    if (participantError) {
      console.error('Error checking participant:', participantError);
      throw new Error('Failed to verify participant status');
    }

    // If not a participant, for direct conversations, try to add them
    if (!participant) {
      if (conversation.type === 'direct') {
        // Get all participants
        const { data: allParticipants } = await supabaseAdmin
          .from('conversation_participants')
          .select('user_id')
          .eq('conversation_id', conversationId);
        
        const participantIds = allParticipants?.map(p => p.user_id) || [];
        
        // For direct conversations, if there's only 1 participant, add the sender
        // OR if there are 0 participants, add the sender (edge case)
        if (participantIds.length === 0 || participantIds.length === 1) {
          try {
            const { error: addError } = await supabaseAdmin
              .from('conversation_participants')
              .insert({
                conversation_id: conversationId,
                user_id: senderId,
                joined_at: new Date().toISOString()
              });
            
            if (addError) {
              // If unique constraint, user was already added (race condition)
              if (addError.code === '23505') {
                console.log(`User ${senderId} already added as participant`);
              } else {
                console.error('Failed to add participant:', addError);
                throw new Error('Not a participant in this conversation');
              }
            } else {
              console.log(`✅ Added user ${senderId} as participant to direct conversation ${conversationId}`);
            }
          } catch (error: any) {
            // If it's a unique constraint error, user is already added
            if (error?.code === '23505') {
              console.log(`User ${senderId} already added as participant (race condition)`);
            } else {
              console.error('Error adding participant:', error);
              throw new Error('Not a participant in this conversation');
            }
          }
        } else if (participantIds.length === 2) {
          // Has 2 participants but sender is not one - this shouldn't happen for direct conversations
          // But if it does, deny access
          throw new Error('Not a participant in this conversation');
        } else {
          // More than 2 participants in a direct conversation - data corruption
          throw new Error('Invalid conversation state');
        }
      } else {
        // Group conversation - strict check
        throw new Error('Not a participant in this conversation');
      }
    }

    const messageId = uuidv4();
    const { data: message, error } = await supabaseAdmin
      .from('messages')
      .insert({
        id: messageId,
        conversation_id: conversationId,
        sender_id: senderId,
        message_type: messageType,
        content,
        file_url: fileUrl,
        file_name: fileName,
        file_size: fileSize,
        reply_to_id: replyToId,
      })
      .select()
      .single();

    if (error) throw error;

    // Update conversation last_message_at
    await supabaseAdmin
      .from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', conversationId);

    // Get message with sender info
    return await this.getMessageById(messageId);
  }

  // Get message by ID
  async getMessageById(messageId: string): Promise<Message> {
    const { data: message, error } = await supabaseAdmin
      .from('messages')
      .select('*')
      .eq('id', messageId)
      .single();

    if (error) throw error;

    // Get sender info
    const { data: sender } = await supabaseAdmin
      .from('users')
      .select('id, first_name, last_name, avatar_url')
      .eq('id', message.sender_id)
      .single();

    // Get reply_to message if exists
    let replyTo: Message | undefined;
    if (message.reply_to_id) {
      replyTo = await this.getMessageById(message.reply_to_id);
    }

    return {
      ...message,
      sender,
      reply_to: replyTo,
    } as Message;
  }

  // Get messages for conversation
  async getConversationMessages(conversationId: string, userId: string, page = 1, limit = 50): Promise<Message[]> {
    // Verify user is participant
    const { data: participant } = await supabaseAdmin
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', conversationId)
      .eq('user_id', userId)
      .single();

    if (!participant) {
      throw new Error('Not a participant in this conversation');
    }

    const offset = (page - 1) * limit;

    const { data: messages, error } = await supabaseAdmin
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // Get sender info for each message
    const messagesWithSenders = await Promise.all(
      (messages || []).map(async (msg) => {
        const { data: sender } = await supabaseAdmin
          .from('users')
          .select('id, first_name, last_name, avatar_url')
          .eq('id', msg.sender_id)
          .single();

        let replyTo: Message | undefined;
        if (msg.reply_to_id) {
          replyTo = await this.getMessageById(msg.reply_to_id);
        }

        return {
          ...msg,
          sender,
          reply_to: replyTo,
        } as Message;
      })
    );

    return messagesWithSenders.reverse(); // Return in chronological order
  }

  // Mark conversation as read
  async markAsRead(conversationId: string, userId: string): Promise<void> {
    await supabaseAdmin
      .from('conversation_participants')
      .update({ last_read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .eq('user_id', userId);
  }

  // Save call history
  async saveCallHistory(
    conversationId: string,
    callerId: string,
    callType: 'audio' | 'video',
    status: 'missed' | 'answered' | 'declined' | 'cancelled',
    startedAt: string,
    endedAt?: string,
    duration?: number
  ): Promise<CallHistory> {
    const callId = uuidv4();
    const { data: callHistory, error } = await supabaseAdmin
      .from('call_history')
      .insert({
        id: callId,
        conversation_id: conversationId,
        caller_id: callerId,
        call_type: callType,
        status,
        started_at: startedAt,
        ended_at: endedAt,
        duration,
      })
      .select()
      .single();

    if (error) throw error;

    return callHistory as CallHistory;
  }

  // Add reaction to message
  async addReaction(messageId: string, userId: string, emoji: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('message_reactions')
      .upsert({
        message_id: messageId,
        user_id: userId,
        emoji,
        created_at: new Date().toISOString(),
      }, {
        onConflict: 'message_id,user_id,emoji'
      });

    if (error) throw error;
  }

  // Remove reaction from message
  async removeReaction(messageId: string, userId: string, emoji: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('message_reactions')
      .delete()
      .eq('message_id', messageId)
      .eq('user_id', userId)
      .eq('emoji', emoji);

    if (error) throw error;
  }

  // Get reactions for a message
  async getMessageReactions(messageId: string): Promise<any[]> {
    const { data, error } = await supabaseAdmin
      .from('message_reactions')
      .select(`
        id,
        emoji,
        user_id,
        created_at,
        user:users!message_reactions_user_id_fkey(id, first_name, last_name, avatar_url)
      `)
      .eq('message_id', messageId);

    if (error) throw error;
    return data || [];
  }

  // Edit message
  async editMessage(messageId: string, userId: string, newContent: string): Promise<Message> {
    // Verify user is the sender
    const { data: message, error: fetchError } = await supabaseAdmin
      .from('messages')
      .select('sender_id')
      .eq('id', messageId)
      .single();

    if (fetchError) throw fetchError;
    if (message.sender_id !== userId) {
      throw new Error('You can only edit your own messages');
    }

    const { data: updatedMessage, error } = await supabaseAdmin
      .from('messages')
      .update({
        content: newContent,
        is_edited: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', messageId)
      .select()
      .single();

    if (error) throw error;
    return await this.getMessageById(messageId);
  }

  // Delete message
  async deleteMessage(messageId: string, userId: string): Promise<void> {
    // Verify user is the sender
    const { data: message, error: fetchError } = await supabaseAdmin
      .from('messages')
      .select('sender_id')
      .eq('id', messageId)
      .single();

    if (fetchError) throw fetchError;
    if (message.sender_id !== userId) {
      throw new Error('You can only delete your own messages');
    }

    const { error } = await supabaseAdmin
      .from('messages')
      .update({
        is_deleted: true,
        content: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', messageId);

    if (error) throw error;
  }

  // Update online status
  async updateOnlineStatus(userId: string, isOnline: boolean): Promise<void> {
    const { error } = await supabaseAdmin
      .from('user_online_status')
      .upsert({
        user_id: userId,
        is_online: isOnline,
        last_seen: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id'
      });

    if (error) throw error;
  }

  // Get online status for users
  async getOnlineStatus(userIds: string[]): Promise<Map<string, { isOnline: boolean; lastSeen: string }>> {
    const { data, error } = await supabaseAdmin
      .from('user_online_status')
      .select('user_id, is_online, last_seen')
      .in('user_id', userIds);

    if (error) throw error;

    const statusMap = new Map();
    (data || []).forEach((status: any) => {
      statusMap.set(status.user_id, {
        isOnline: status.is_online,
        lastSeen: status.last_seen,
      });
    });

    return statusMap;
  }

  // Add member to group
  async addGroupMember(conversationId: string, userId: string, addedBy: string): Promise<void> {
    // Verify conversation is a group
    const { data: conversation, error: convError } = await supabaseAdmin
      .from('conversations')
      .select('type')
      .eq('id', conversationId)
      .single();

    if (convError) throw convError;
    if (conversation.type !== 'group') {
      throw new Error('Can only add members to group conversations');
    }

    // Check if user is already a member
    const { data: existing } = await supabaseAdmin
      .from('conversation_participants')
      .select('id')
      .eq('conversation_id', conversationId)
      .eq('user_id', userId)
      .single();

    if (existing) {
      throw new Error('User is already a member');
    }

    // Add member
    const { error } = await supabaseAdmin
      .from('conversation_participants')
      .insert({
        conversation_id: conversationId,
        user_id: userId,
        joined_at: new Date().toISOString(),
      });

    if (error) throw error;

    // Assign member role (default)
    await supabaseAdmin
      .from('conversation_roles')
      .upsert({
        conversation_id: conversationId,
        user_id: userId,
        role: 'member',
        assigned_by: addedBy,
        assigned_at: new Date().toISOString(),
      }, {
        onConflict: 'conversation_id,user_id'
      });
  }

  // Remove member from group
  async removeGroupMember(conversationId: string, userId: string, removedBy: string): Promise<void> {
    // Verify conversation is a group
    const { data: conversation, error: convError } = await supabaseAdmin
      .from('conversations')
      .select('type')
      .eq('id', conversationId)
      .single();

    if (convError) throw convError;
    if (conversation.type !== 'group') {
      throw new Error('Can only remove members from group conversations');
    }

    // Verify remover has permission (admin or moderator)
    const { data: role } = await supabaseAdmin
      .from('conversation_roles')
      .select('role')
      .eq('conversation_id', conversationId)
      .eq('user_id', removedBy)
      .single();

    if (!role || (role.role !== 'admin' && role.role !== 'moderator')) {
      throw new Error('You do not have permission to remove members');
    }

    // Remove member
    const { error } = await supabaseAdmin
      .from('conversation_participants')
      .delete()
      .eq('conversation_id', conversationId)
      .eq('user_id', userId);

    if (error) throw error;

    // Remove role
    await supabaseAdmin
      .from('conversation_roles')
      .delete()
      .eq('conversation_id', conversationId)
      .eq('user_id', userId);
  }

  // Get recommended contacts for messaging
  async getRecommendedContacts(userId: string, limit: number = 10, page: number = 1): Promise<any[]> {
    const offset = (page - 1) * limit;
    
    // Get users who have messaged with current user
    const { data: conversations, error: convError } = await supabaseAdmin
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', userId);

    if (convError) throw convError;

    const conversationIds = conversations?.map(c => c.conversation_id) || [];
    
    // Get all users (excluding current user) for suggestions
    const { data: allUsers, error: allUsersError } = await supabaseAdmin
      .from('users')
      .select('id, first_name, last_name, avatar_url, job')
      .neq('id', userId);
    
    if (allUsersError) throw allUsersError;
    if (!allUsers) return [];

    // Build scoring system
    const userScores = new Map<string, { user: any; score: number; lastMessageAt: string | null; messageCount: number }>();
    
    allUsers.forEach((user: any) => {
      userScores.set(user.id, {
        user,
        score: 0,
        lastMessageAt: null,
        messageCount: 0,
      });
    });

    if (conversationIds.length > 0) {
      // Get participants from user's conversations
      const { data: participants } = await supabaseAdmin
        .from('conversation_participants')
        .select('user_id, conversation_id')
        .in('conversation_id', conversationIds)
        .neq('user_id', userId);

      const participantIds = [...new Set(participants?.map(p => p.user_id) || [])];

      if (participantIds.length > 0) {
        // Get message counts and last message time
        const { data: messages } = await supabaseAdmin
          .from('messages')
          .select('sender_id, conversation_id, created_at')
          .in('conversation_id', conversationIds)
          .in('sender_id', participantIds)
          .order('created_at', { ascending: false });

        // Calculate message stats per user
        messages?.forEach((msg: any) => {
          const userData = userScores.get(msg.sender_id);
          if (userData) {
            userData.messageCount++;
            if (!userData.lastMessageAt || new Date(msg.created_at) > new Date(userData.lastMessageAt)) {
              userData.lastMessageAt = msg.created_at;
            }
          }
        });

        // Calculate scores
        userScores.forEach((userData, userId) => {
          let score = 0;
          
          // Has messaged before: +100 points
          if (userData.messageCount > 0) {
            score += 100;
            
            // Recent message: +50 points if within last 7 days
            if (userData.lastMessageAt) {
              const daysSinceLastMessage = (Date.now() - new Date(userData.lastMessageAt).getTime()) / (1000 * 60 * 60 * 24);
              if (daysSinceLastMessage < 7) {
                score += 50;
              } else if (daysSinceLastMessage < 30) {
                score += 25;
              }
            }
            
            // Message count: +1 point per message (capped at 50)
            score += Math.min(userData.messageCount, 50);
          }
          
          userData.score = score;
        });
      }
    }

    // Get follows/interactions for users who haven't messaged
    const { data: followData } = await supabaseAdmin
      .from('user_interactions')
      .select('target_user_id')
      .eq('user_id', userId)
      .eq('interaction_type', 'follow');
    
    const followedUserIds = new Set(followData?.map(f => f.target_user_id) || []);
    
    // Boost score for followed users who haven't messaged
    followedUserIds.forEach(followedId => {
      const userData = userScores.get(followedId);
      if (userData && userData.score === 0) {
        userData.score = 30; // Lower than messaged users but higher than random
      }
    });

    // Convert to array and sort by score
    const recommended = Array.from(userScores.values())
      .sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }
        // If same score, sort by last message time
        if (a.lastMessageAt && b.lastMessageAt) {
          return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
        }
        if (a.lastMessageAt) return -1;
        if (b.lastMessageAt) return 1;
        return 0;
      })
      .slice(offset, offset + limit)
      .map(userData => ({
        ...userData.user,
        messageCount: userData.messageCount,
        lastMessageAt: userData.lastMessageAt,
        score: userData.score,
      }));

    return recommended;
  }
}

export const chatService = new ChatService();


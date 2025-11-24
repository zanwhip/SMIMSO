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
      .select(`
        id,
        type,
        name,
        created_by,
        created_at,
        updated_at,
        last_message_at,
        conversation_participants!inner(user_id)
      `)
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
    const { error: convError } = await supabaseAdmin
      .from('conversations')
      .insert({
        id: conversationId,
        type: 'direct',
        created_by: user1Id,
      });

    if (convError) throw convError;

    // Add both participants
    await supabaseAdmin
      .from('conversation_participants')
      .insert([
        { conversation_id: conversationId, user_id: user1Id },
        { conversation_id: conversationId, user_id: user2Id },
      ]);

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
    // Verify user is participant
    const { data: participant } = await supabaseAdmin
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', conversationId)
      .eq('user_id', userId)
      .single();

    if (!participant) {
      throw new Error('Conversation not found or access denied');
    }

    const { data: conversation, error } = await supabaseAdmin
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (error) throw error;

    // Get participants with user info
    const { data: participants } = await supabaseAdmin
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
    // Verify user is participant
    const { data: participant } = await supabaseAdmin
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', conversationId)
      .eq('user_id', senderId)
      .single();

    if (!participant) {
      throw new Error('Not a participant in this conversation');
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
  async getRecommendedContacts(userId: string, limit: number = 10): Promise<any[]> {
    // Get users who have messaged with current user
    const { data: conversations, error: convError } = await supabaseAdmin
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', userId);

    if (convError) throw convError;

    const conversationIds = conversations?.map(c => c.conversation_id) || [];

    if (conversationIds.length === 0) {
      // If no conversations, return users with mutual connections or similar interests
      const { data: allUsers } = await supabaseAdmin
        .from('users')
        .select('id, first_name, last_name, avatar_url, job')
        .neq('id', userId)
        .limit(limit);

      return (allUsers || []).map((user: any) => ({
        ...user,
        messageCount: 0,
        lastMessageAt: null,
        mutualConnections: 0,
      }));
    }

    // Get participants from user's conversations
    const { data: participants, error: partError } = await supabaseAdmin
      .from('conversation_participants')
      .select('user_id, conversation_id')
      .in('conversation_id', conversationIds)
      .neq('user_id', userId);

    if (partError) throw partError;

    const participantIds = [...new Set(participants?.map(p => p.user_id) || [])];

    if (participantIds.length === 0) {
      return [];
    }

    // Get message counts and last message time for each participant
    const { data: messages, error: msgError } = await supabaseAdmin
      .from('messages')
      .select('sender_id, conversation_id, created_at')
      .in('conversation_id', conversationIds)
      .in('sender_id', participantIds)
      .order('created_at', { ascending: false });

    if (msgError) throw msgError;

    // Calculate message stats per user
    const userStats = new Map<string, { count: number; lastMessageAt: string | null }>();
    participantIds.forEach(id => {
      userStats.set(id, { count: 0, lastMessageAt: null });
    });

    messages?.forEach((msg: any) => {
      const stats = userStats.get(msg.sender_id);
      if (stats) {
        stats.count++;
        if (!stats.lastMessageAt || new Date(msg.created_at) > new Date(stats.lastMessageAt)) {
          stats.lastMessageAt = msg.created_at;
        }
      }
    });

    // Get user details
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id, first_name, last_name, avatar_url, job')
      .in('id', participantIds);

    if (usersError) throw usersError;

    // Combine user data with stats
    const recommended = (users || []).map((user: any) => {
      const stats = userStats.get(user.id) || { count: 0, lastMessageAt: null };
      return {
        ...user,
        messageCount: stats.count,
        lastMessageAt: stats.lastMessageAt,
        mutualConnections: 0, // Could be enhanced with friend relationships
      };
    });

    // Sort by: recent messages first, then by message count
    recommended.sort((a, b) => {
      if (a.lastMessageAt && b.lastMessageAt) {
        return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
      }
      if (a.lastMessageAt) return -1;
      if (b.lastMessageAt) return 1;
      return b.messageCount - a.messageCount;
    });

    return recommended.slice(0, limit);
  }
}

export const chatService = new ChatService();


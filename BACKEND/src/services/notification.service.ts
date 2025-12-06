import { Response } from 'express';
import supabase from '../config/supabase';

interface SSEClient {
  userId: string;
  response: Response;
}

export class NotificationService {
  private clients: Map<string, SSEClient[]> = new Map();

  addClient(userId: string, res: Response) {
    const client: SSEClient = { userId, response: res };
    
    if (!this.clients.has(userId)) {
      this.clients.set(userId, []);
    }
    
    this.clients.get(userId)!.push(client);
    
    this.sendToClient(client, {
      type: 'connected',
      message: 'Connected to notification stream',
      timestamp: new Date().toISOString(),
    });
  }

  removeClient(userId: string, res: Response) {
    const userClients = this.clients.get(userId);
    if (userClients) {
      const filtered = userClients.filter(client => client.response !== res);
      if (filtered.length > 0) {
        this.clients.set(userId, filtered);
      } else {
        this.clients.delete(userId);
      }
      }
  }

  sendToUser(userId: string, notification: any) {
    const userClients = this.clients.get(userId);
    if (userClients && userClients.length > 0) {
      userClients.forEach(client => {
        this.sendToClient(client, notification);
      });
    }
  }

  private sendToClient(client: SSEClient, data: any) {
    try {
      client.response.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (error) {
      // Error handling
    }
  }

  async createNotification(data: {
    user_id: string;
    type: 'like' | 'comment' | 'follow' | 'mention';
    content: string;
    related_user_id?: string;
    post_id?: string;
  }) {
    try {
      const { data: notification, error } = await supabase
        .from('notifications')
        .insert(data)
        .select(`
          *,
          related_user:users!notifications_related_user_id_fkey(id, first_name, last_name, avatar_url),
          post:posts(id, title)
        `)
        .single();

      if (error) throw error;

      this.sendToUser(data.user_id, {
        type: 'notification',
        data: notification,
        timestamp: new Date().toISOString(),
      });

      return notification;
    } catch (error: any) {
      throw error;
    }
  }

  async getUnreadCount(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) throw error;
    return count || 0;
  }

  async markAsRead(notificationId: string, userId: string) {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('user_id', userId);

    if (error) throw error;
  }

  async markAllAsRead(userId: string) {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) throw error;
  }

  async getNotifications(userId: string, page: number = 1, limit: number = 20) {
    const offset = (page - 1) * limit;

    const { data, error, count } = await supabase
      .from('notifications')
      .select(`
        *,
        related_user:users!notifications_related_user_id_fkey(id, first_name, last_name, avatar_url),
        post:posts(id, title)
      `, { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    const unreadCount = await this.getUnreadCount(userId);

    return {
      notifications: data || [],
      total: count || 0,
      unreadCount,
    };
  }
}

export const notificationService = new NotificationService();


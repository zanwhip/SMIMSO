import webpush from 'web-push';
import { supabaseAdmin } from '../config/supabase';

// Configure VAPID keys
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:your-email@example.com', // Contact email
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
}

export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export class PushNotificationService {
  // Save user's push subscription
  async saveSubscription(userId: string, subscription: PushSubscription): Promise<void> {
    const { error } = await supabaseAdmin
      .from('user_push_subscriptions')
      .upsert({
        user_id: userId,
        subscription: subscription,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id'
      });

    if (error) {
      throw new Error(`Failed to save subscription: ${error.message}`);
    }
  }

  // Get user's push subscription
  async getSubscription(userId: string): Promise<PushSubscription | null> {
    const { data, error } = await supabaseAdmin
      .from('user_push_subscriptions')
      .select('subscription')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return null;
    }

    return data.subscription as PushSubscription;
  }

  // Send push notification to user
  async sendNotification(
    userId: string,
    title: string,
    body: string,
    data?: any
  ): Promise<void> {
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      console.warn('VAPID keys not configured. Push notifications disabled.');
      return;
    }

    const subscription = await this.getSubscription(userId);
    if (!subscription) {
      console.log(`No push subscription found for user ${userId}`);
      return;
    }

    try {
      await webpush.sendNotification(
        subscription,
        JSON.stringify({
          title,
          body,
          icon: '/icon-192x192.png',
          badge: '/badge-72x72.png',
          data: data || {},
        })
      );
    } catch (error: any) {
      console.error('Failed to send push notification:', error);
      
      // If subscription is invalid, remove it
      if (error.statusCode === 410 || error.statusCode === 404) {
        await supabaseAdmin
          .from('user_push_subscriptions')
          .delete()
          .eq('user_id', userId);
      }
    }
  }

  // Send notification to multiple users
  async sendNotificationToUsers(
    userIds: string[],
    title: string,
    body: string,
    data?: any
  ): Promise<void> {
    await Promise.all(
      userIds.map(userId => this.sendNotification(userId, title, body, data))
    );
  }

  // Remove user's push subscription
  async removeSubscription(userId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('user_push_subscriptions')
      .delete()
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to remove subscription: ${error.message}`);
    }
  }
}

export const pushNotificationService = new PushNotificationService();


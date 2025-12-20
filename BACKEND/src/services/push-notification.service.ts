import webpush from 'web-push';
import { supabaseAdmin } from '../config/supabase';

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_EMAIL = process.env.VAPID_EMAIL || 'mailto:admin@example.com';

// Initialize VAPID keys only if both are provided and valid
let vapidInitialized = false;
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  try {
    // Remove padding "=" and whitespace from keys if present
    // web-push requires URL-safe base64 without padding
    const cleanPublicKey = VAPID_PUBLIC_KEY.trim().replace(/=/g, '').replace(/\s/g, '');
    const cleanPrivateKey = VAPID_PRIVATE_KEY.trim().replace(/=/g, '').replace(/\s/g, '');
    
    // Validate keys are not empty after cleaning
    if (cleanPublicKey && cleanPrivateKey && cleanPublicKey.length > 0 && cleanPrivateKey.length > 0) {
      webpush.setVapidDetails(
        VAPID_EMAIL,
        cleanPublicKey,
        cleanPrivateKey
      );
      vapidInitialized = true;
    }
  } catch (error) {
    // Silently fail if VAPID keys are invalid
    // Push notifications will be disabled
    vapidInitialized = false;
  }
}

export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export class PushNotificationService {
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

  async sendNotification(
    userId: string,
    title: string,
    body: string,
    data?: any
  ): Promise<void> {
    if (!vapidInitialized) {
      return;
    }

    const subscription = await this.getSubscription(userId);
    if (!subscription) {
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
      if (error.statusCode === 410 || error.statusCode === 404) {
        await supabaseAdmin
          .from('user_push_subscriptions')
          .delete()
          .eq('user_id', userId);
      }
    }
  }

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


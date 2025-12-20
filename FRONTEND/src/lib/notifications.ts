type NotificationPermissionType = 'granted' | 'denied' | 'default';

export class NotificationService {
  private registration: ServiceWorkerRegistration | null = null;

  async requestPermission(): Promise<NotificationPermissionType> {
    if (!('Notification' in window)) {
      return 'denied';
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    if (Notification.permission === 'denied') {
      return 'denied';
    }

    try {
      const permission = await Notification.requestPermission();
      return permission;
    } catch (error) {
      return 'denied';
    }
  }

  getPermissionStatus(): NotificationPermissionType {
    if (!('Notification' in window)) {
      return 'denied';
    }
    return Notification.permission as NotificationPermissionType;
  }

  canRequestPermission(): boolean {
    return this.getPermissionStatus() === 'default';
  }

  async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (!('serviceWorker' in navigator)) {
      return null;
    }

    try {
      this.registration = await navigator.serviceWorker.register('/sw.js');
      return this.registration;
    } catch (error) {
      return null;
    }
  }

  async subscribeToPushNotifications(): Promise<PushSubscription | null> {
    if (!this.registration) {
      await this.registerServiceWorker();
    }

    if (!this.registration) {
      return null;
    }

    try {
      const key = this.urlBase64ToUint8Array(
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
      );
      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: key as BufferSource,
      });

      return subscription;
    } catch (error) {
      return null;
    }
  }

  async unsubscribeFromPushNotifications(): Promise<boolean> {
    if (!this.registration) {
      return false;
    }

    try {
      const subscription = await this.registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  showLocalNotification(title: string, options?: NotificationOptions): void {
    if (Notification.permission === 'granted' && this.registration) {
      this.registration.showNotification(title, {
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png',
        ...options,
      });
    }
  }
}

export const notificationService = new NotificationService();


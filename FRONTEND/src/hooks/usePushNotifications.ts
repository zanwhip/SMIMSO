import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import { notificationService } from '@/lib/notifications';
import toast from 'react-hot-toast';

type NotificationPermissionType = 'granted' | 'denied' | 'default';

export function usePushNotifications() {
  const { user, isAuthenticated } = useAuthStore();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermissionType>('default');

  useEffect(() => {
    // Check if browser supports push notifications
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      
      // Check permission status
      if ('Notification' in window) {
        setPermissionStatus(Notification.permission as NotificationPermissionType);
      }
      
      // Register service worker
      notificationService.registerServiceWorker();
      
      // Check existing subscription
      checkSubscription();
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && user) {
      checkSubscription();
    }
  }, [isAuthenticated, user]);

  const checkSubscription = async () => {
    if (!isSupported) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
  };

  const subscribe = async () => {
    if (!isSupported || !user) {
      toast.error('Push notifications are not supported in this browser');
      return false;
    }

    try {
      // Check current permission status
      if (Notification.permission === 'denied') {
        toast.error(
          'Quyền thông báo đã bị từ chối. Vui lòng bật lại trong cài đặt trình duyệt:\n' +
          'Chrome/Edge: Cài đặt > Quyền > Thông báo\n' +
          'Firefox: Cài đặt > Quyền > Thông báo',
          { duration: 6000 }
        );
        return false;
      }

      // Request permission
      const permission = await notificationService.requestPermission();
      if (permission === 'denied') {
        toast.error(
          'Bạn đã từ chối quyền thông báo. Để bật lại:\n' +
          '1. Click vào biểu tượng khóa/ảnh ở thanh địa chỉ\n' +
          '2. Chọn "Cho phép" ở mục Thông báo\n' +
          '3. Tải lại trang',
          { duration: 6000 }
        );
        return false;
      }

      if (permission !== 'granted') {
        toast.error('Không thể lấy quyền thông báo. Vui lòng thử lại.');
        return false;
      }

      // Subscribe to push
      const subscription = await notificationService.subscribeToPushNotifications();
      if (!subscription) {
        toast.error('Failed to subscribe to push notifications');
        return false;
      }

      // Send subscription to server
      await api.post('/chat/push/subscribe', {
        subscription: {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: arrayBufferToBase64(subscription.getKey('p256dh')!),
            auth: arrayBufferToBase64(subscription.getKey('auth')!),
          },
        },
      });

      setIsSubscribed(true);
      toast.success('Push notifications enabled');
      return true;
    } catch (error: any) {
      console.error('Error subscribing to push:', error);
      toast.error('Failed to enable push notifications');
      return false;
    }
  };

  const unsubscribe = async () => {
    if (!isSupported || !user) {
      return false;
    }

    try {
      await notificationService.unsubscribeFromPushNotifications();
      await api.delete('/chat/push/unsubscribe');
      setIsSubscribed(false);
      toast.success('Push notifications disabled');
      return true;
    } catch (error: any) {
      console.error('Error unsubscribing from push:', error);
      toast.error('Failed to disable push notifications');
      return false;
    }
  };

  return {
    isSupported,
    isSubscribed,
    permissionStatus,
    subscribe,
    unsubscribe,
  };
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}


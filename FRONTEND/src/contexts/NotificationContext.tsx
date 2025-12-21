'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import { getAuthToken } from '@/lib/api';

interface Notification {
  id: string;
  user_id: string;
  type: 'like' | 'comment' | 'follow' | 'mention';
  content: string;
  related_user_id?: string;
  post_id?: string;
  is_read: boolean;
  created_at: string;
  related_user?: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url?: string;
  };
  post?: {
    id: string;
    title: string;
  };
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  connected: boolean;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const { isAuthenticated, token } = useAuthStore();
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await api.get('/notifications?page=1&limit=50');
      const data = response.data.data;
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
      setLoading(false);
    } catch (error) {
      setLoading(false);
    }
  }, []);

  const connectToSSE = useCallback(() => {
    if (!isAuthenticated || !token) {
      return;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://smimso-api-production.up.railway.app/api';
    const sseUrl = `${API_URL}/notifications/stream?token=${encodeURIComponent(token)}`;

    try {
      const eventSource = new EventSource(sseUrl);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        setConnected(true);
        reconnectAttempts.current = 0;
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'connected') {
            } else if (data.type === 'initial_data') {
            setNotifications(data.data.notifications || []);
            setUnreadCount(data.data.unreadCount || 0);
            setLoading(false);
            } else if (data.type === 'notification') {
            const notification = data.data;
            setNotifications((prev) => [notification, ...prev]);
            setUnreadCount((prev) => prev + 1);
            } else if (data.type === 'error') {
            }
        } catch (error) {
          }
      };

      eventSource.onerror = (error) => {
        setConnected(false);
        eventSource.close();

        if (reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000); // Exponential backoff, max 30s

          reconnectTimeoutRef.current = setTimeout(() => {
            connectToSSE();
          }, delay);
        } else {
          fetchNotifications();
        }
      };
    } catch (error) {
      setConnected(false);
      fetchNotifications();
    }
  }, [isAuthenticated, token, fetchNotifications]);

  const disconnectFromSSE = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    setConnected(false);
    reconnectAttempts.current = 0;
  }, []);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await api.put(`/notifications/${notificationId}/read`);
      setNotifications((prev) =>
        prev.map((notif) =>
          notif.id === notificationId ? { ...notif, is_read: true } : notif
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications((prev) => prev.map((notif) => ({ ...notif, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      }
  }, []);

  const refreshNotifications = useCallback(async () => {
    await fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (isAuthenticated && token) {
      fetchNotifications();
      connectToSSE();
    } else {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      disconnectFromSSE();
    }

    return () => {
      disconnectFromSSE();
    };
  }, [isAuthenticated, token, connectToSSE, disconnectFromSSE, fetchNotifications]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isAuthenticated && token && !connected) {
        connectToSSE();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAuthenticated, token, connected, connectToSSE]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        connected,
        markAsRead,
        markAllAsRead,
        refreshNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}


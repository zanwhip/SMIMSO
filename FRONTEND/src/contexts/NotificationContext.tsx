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

  // Fetch notifications from API
  const fetchNotifications = useCallback(async () => {
    try {
      const response = await api.get('/notifications?page=1&limit=50');
      const data = response.data.data;
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      setLoading(false);
    }
  }, []);

  // Connect to SSE stream
  const connectToSSE = useCallback(() => {
    if (!isAuthenticated || !token) {
      console.log('🔔 Not authenticated, skipping SSE connection');
      return;
    }

    // Close existing connection if any
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
    const sseUrl = `${API_URL}/notifications/stream?token=${encodeURIComponent(token)}`;

    console.log('🔌 Connecting to SSE stream:', sseUrl);

    try {
      const eventSource = new EventSource(sseUrl);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log('✅ SSE connection opened');
        setConnected(true);
        reconnectAttempts.current = 0;
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📨 Received SSE message:', data);

          if (data.type === 'connected') {
            console.log('✅ Connected to notification stream');
          } else if (data.type === 'initial_data') {
            // Set initial data
            setNotifications(data.data.notifications || []);
            setUnreadCount(data.data.unreadCount || 0);
            setLoading(false);
            console.log(`📦 Initial data loaded: ${data.data.notifications.length} notifications, ${data.data.unreadCount} unread`);
          } else if (data.type === 'notification') {
            // New notification received
            const notification = data.data;
            setNotifications((prev) => [notification, ...prev]);
            setUnreadCount((prev) => prev + 1);
            console.log('🔔 New notification received:', notification);
          } else if (data.type === 'error') {
            console.error('❌ SSE error:', data.message);
          }
        } catch (error) {
          console.error('Failed to parse SSE message:', error);
        }
      };

      eventSource.onerror = (error) => {
        console.error('❌ SSE connection error:', error);
        setConnected(false);
        eventSource.close();

        // Attempt to reconnect
        if (reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000); // Exponential backoff, max 30s
          console.log(`🔄 Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current}/${maxReconnectAttempts})`);

          reconnectTimeoutRef.current = setTimeout(() => {
            connectToSSE();
          }, delay);
        } else {
          console.error('❌ Max reconnection attempts reached');
          // Fallback to polling
          fetchNotifications();
        }
      };
    } catch (error) {
      console.error('Failed to create SSE connection:', error);
      setConnected(false);
      // Fallback to polling
      fetchNotifications();
    }
  }, [isAuthenticated, token, fetchNotifications]);

  // Disconnect from SSE
  const disconnectFromSSE = useCallback(() => {
    if (eventSourceRef.current) {
      console.log('🔌 Disconnecting from SSE stream');
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

  // Mark notification as read
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
      console.error('Failed to mark notification as read:', error);
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications((prev) => prev.map((notif) => ({ ...notif, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  }, []);

  // Refresh notifications
  const refreshNotifications = useCallback(async () => {
    await fetchNotifications();
  }, [fetchNotifications]);

  // Initialize connection when authenticated
  useEffect(() => {
    if (isAuthenticated && token) {
      // Initial fetch
      fetchNotifications();
      // Connect to SSE
      connectToSSE();
    } else {
      // Clear state when not authenticated
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      disconnectFromSSE();
    }

    // Cleanup on unmount
    return () => {
      disconnectFromSSE();
    };
  }, [isAuthenticated, token, connectToSSE, disconnectFromSSE, fetchNotifications]);

  // Reconnect when page becomes visible (user comes back to tab)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isAuthenticated && token && !connected) {
        console.log('👁️ Page visible, reconnecting SSE');
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


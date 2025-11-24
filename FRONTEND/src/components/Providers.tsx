'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { ChatProvider } from '@/contexts/ChatContext';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const initializeAuth = useAuthStore((state) => state.initializeAuth);
  const fetchCurrentUser = useAuthStore((state) => state.fetchCurrentUser);

  useEffect(() => {
    setMounted(true);
    // Initialize auth from persisted storage
    initializeAuth();
    // Fetch current user to verify token is still valid
    // Use a delay to avoid race conditions with login/register
    const timer = setTimeout(() => {
      const state = useAuthStore.getState();
      // Only fetch if we have a token but no user (e.g., page refresh)
      if (state.token && !state.user) {
        fetchCurrentUser();
      } else if (!state.token) {
        // No token, ensure loading is false
        useAuthStore.setState({ isLoading: false });
      }
    }, 200);
    
    return () => clearTimeout(timer);
  }, [initializeAuth, fetchCurrentUser]);

  if (!mounted) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <NotificationProvider>
        <ChatProvider>
          {children}
        </ChatProvider>
      </NotificationProvider>
    </QueryClientProvider>
  );
}


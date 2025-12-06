'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { ChatProvider } from '@/contexts/ChatContext';
import GlobalCallHandler from '@/components/GlobalCallHandler';

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
  const [isHydrated, setIsHydrated] = useState(false);
  const initializeAuth = useAuthStore((state) => state.initializeAuth);
  const fetchCurrentUser = useAuthStore((state) => state.fetchCurrentUser);

  useEffect(() => {
    setMounted(true);
    
    const checkHydration = () => {
      const state = useAuthStore.getState();
      const hasPersistedData = localStorage.getItem('auth-storage');
      
      if (hasPersistedData) {
        setTimeout(() => {
          initializeAuth();
          const hydratedState = useAuthStore.getState();
          if (hydratedState.token && !hydratedState.user) {
            fetchCurrentUser();
          } else if (hydratedState.token && hydratedState.user && !hydratedState.isAuthenticated) {
            useAuthStore.setState({ isAuthenticated: true, isLoading: false });
          } else if (!hydratedState.token) {
            useAuthStore.setState({ isLoading: false, isAuthenticated: false });
          }
          
          setIsHydrated(true);
        }, 100);
      } else {
        initializeAuth();
        setIsHydrated(true);
      }
    };
    
    checkHydration();
  }, [initializeAuth, fetchCurrentUser]);

  if (!mounted || !isHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <NotificationProvider>
        <ChatProvider>
          {children}
          <GlobalCallHandler />
        </ChatProvider>
      </NotificationProvider>
    </QueryClientProvider>
  );
}


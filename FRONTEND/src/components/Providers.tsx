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
    
    // Wait for zustand persist to hydrate from localStorage
    const checkHydration = () => {
      const state = useAuthStore.getState();
      // If we have persisted data, wait a bit more for hydration
      const hasPersistedData = localStorage.getItem('auth-storage');
      
      if (hasPersistedData) {
        // Give persist middleware time to hydrate
        setTimeout(() => {
          initializeAuth();
          const hydratedState = useAuthStore.getState();
          console.log('Hydrated auth state:', hydratedState);
          
          // Fetch current user to verify token is still valid
          if (hydratedState.token && !hydratedState.user) {
            fetchCurrentUser();
          } else if (hydratedState.token && hydratedState.user && !hydratedState.isAuthenticated) {
            // Have token and user but isAuthenticated is false - fix it
            useAuthStore.setState({ isAuthenticated: true, isLoading: false });
          } else if (!hydratedState.token) {
            // No token, ensure loading is false and not authenticated
            useAuthStore.setState({ isLoading: false, isAuthenticated: false });
          }
          
          setIsHydrated(true);
        }, 100);
      } else {
        // No persisted data, just initialize
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


import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@/types';
import api, { setAuthToken, removeAuthToken } from '@/lib/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (emailOrPhone: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  googleLogin: (token: string) => Promise<{ isNewUser: boolean }>;
  logout: () => void;
  fetchCurrentUser: () => Promise<void>;
  updateUser: (user: User) => void;
  initializeAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: true,

      login: async (emailOrPhone: string, password: string) => {
        try {
          set({ isLoading: true });
          const response = await api.post('/auth/login', {
            emailOrPhone,
            password,
          });

          const { user, token } = response.data.data;

          setAuthToken(token);

          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error: any) {
          set({ isLoading: false });
          throw new Error(error.response?.data?.error || 'Login failed');
        }
      },

      register: async (data: any) => {
        try {
          const response = await api.post('/auth/register', data);

          const { user, token } = response.data.data;

          setAuthToken(token);

          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error: any) {
          throw new Error(error.response?.data?.error || 'Registration failed');
        }
      },

      googleLogin: async (token: string) => {
        try {
          const response = await api.post('/auth/google-login', { token });

          const { user, token: jwtToken, isNewUser } = response.data.data;

          setAuthToken(jwtToken);

          set({
            user,
            token: jwtToken,
            isAuthenticated: true,
            isLoading: false,
          });

          return { isNewUser };
        } catch (error: any) {
          throw new Error(error.response?.data?.error || 'Google login failed');
        }
      },

      logout: () => {
        removeAuthToken();
        localStorage.removeItem('auth-storage');
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
        });
      },

      fetchCurrentUser: async () => {
        try {
          const state = get();
          // Don't fetch if already loading (e.g., during login) or already authenticated with user
          if (state.isLoading || (state.isAuthenticated && state.user)) {
            return;
          }

          const token = state.token || localStorage.getItem('token');

          if (!token) {
            set({ isLoading: false });
            return;
          }

          set({ isLoading: true });
          setAuthToken(token);
          const response = await api.get('/auth/me');
          const user = response.data.data;

          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          removeAuthToken();
          localStorage.removeItem('auth-storage');
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      },

      updateUser: (user: User) => {
        set({ user });
      },

      initializeAuth: () => {
        const state = get();
        if (state.token) {
          setAuthToken(state.token);
          set({ isLoading: false });
        } else {
          set({ isLoading: false });
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);


import { create } from 'zustand';
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
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (emailOrPhone: string, password: string) => {
    try {
      const response = await api.post('/auth/login', {
        emailOrPhone,
        password,
      });

      const { user, token } = response.data.data;
      
      setAuthToken(token);
      localStorage.setItem('user', JSON.stringify(user));

      set({
        user,
        token,
        isAuthenticated: true,
      });
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Login failed');
    }
  },

  register: async (data: any) => {
    try {
      const response = await api.post('/auth/register', data);

      const { user, token } = response.data.data;
      
      setAuthToken(token);
      localStorage.setItem('user', JSON.stringify(user));

      set({
        user,
        token,
        isAuthenticated: true,
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
      localStorage.setItem('user', JSON.stringify(user));

      set({
        user,
        token: jwtToken,
        isAuthenticated: true,
      });

      return { isNewUser };
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Google login failed');
    }
  },

  logout: () => {
    removeAuthToken();
    set({
      user: null,
      token: null,
      isAuthenticated: false,
    });
  },

  fetchCurrentUser: async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        set({ isLoading: false });
        return;
      }

      const response = await api.get('/auth/me');
      const user = response.data.data;

      localStorage.setItem('user', JSON.stringify(user));

      set({
        user,
        token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      removeAuthToken();
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },

  updateUser: (user: User) => {
    localStorage.setItem('user', JSON.stringify(user));
    set({ user });
  },
}));


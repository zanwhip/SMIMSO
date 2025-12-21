import axios, { AxiosInstance, AxiosError } from 'axios';

// Get API URL with fallback - handle both undefined and empty string
const getApiUrl = () => {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  const fallbackUrl = 'http://smimso-api-production.up.railway.app/api';
  
  // If envUrl is undefined, null, or empty string, use fallback
  if (!envUrl || envUrl.trim() === '') {
    return fallbackUrl;
  }
  
  return envUrl;
};

// Get base URL without /api for auth routes
const getBaseUrl = () => {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  const fallbackUrl = 'http://smimso-api-production.up.railway.app';
  
  if (!envUrl || envUrl.trim() === '') {
    return fallbackUrl;
  }
  
  // Remove /api if present
  return envUrl.replace('/api', '');
};

const API_URL = getApiUrl();
const BASE_URL = getBaseUrl();

const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds timeout to prevent infinite hanging
});

// Auth API instance without /api prefix
export const authApi: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

export const createApiWithTimeout = (timeout: number = 90000): AxiosInstance => {
  return axios.create({
    baseURL: API_URL,
    headers: {
      'Content-Type': 'application/json',
    },
    timeout,
  });
};

// Add auth token interceptor for authApi
authApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (!error.response) {
      if (error.code === 'ECONNABORTED') {
        return Promise.reject(new Error('Kết nối quá lâu. Vui lòng kiểm tra kết nối mạng và thử lại.'));
      } else if (error.code === 'ERR_NETWORK' || error.message.includes('Network Error')) {
        const apiUrl = error.config?.baseURL || API_URL || 'http://smimso-api-production.up.railway.app';
        const isLocalhost = apiUrl && (apiUrl.includes('localhost') || apiUrl.includes('127.0.0.1'));
        if (isLocalhost && typeof window !== 'undefined') {
          const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
          if (isMobile) {
            return Promise.reject(new Error('Không thể kết nối đến server. Trên điện thoại, vui lòng cấu hình API URL đúng (không dùng localhost).'));
          }
        }
        return Promise.reject(new Error('Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.'));
      }
    }

    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

export const setAuthToken = (token: string) => {
  localStorage.setItem('token', token);
};

export const removeAuthToken = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

export const getAuthToken = () => {
  return localStorage.getItem('token');
};


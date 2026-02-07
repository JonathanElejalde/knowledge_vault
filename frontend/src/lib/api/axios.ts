import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { clearAuthState } from '@/features/auth/hooks/useAuth';

// Extend the AxiosRequestConfig type to include our custom properties
interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

const API_BASE_URL = import.meta.env.VITE_API_URL;
const AUTH_PATHS_TO_SKIP_REFRESH = ['/auth/login/access-token', '/auth/register', '/auth/refresh-token'];

let refreshPromise: Promise<void> | null = null;

const shouldSkipRefresh = (url?: string): boolean => {
  if (!url) return false;
  return AUTH_PATHS_TO_SKIP_REFRESH.some((path) => url.includes(path));
};

const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

const refreshAccessToken = async (): Promise<void> => {
  if (!refreshPromise) {
    refreshPromise = refreshClient
      .post('/auth/refresh-token')
      .then(() => undefined)
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
};

// Create base axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // CRITICAL: Enable cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding timezone
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Add user's timezone to all requests
    try {
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      config.headers['X-Timezone'] = userTimezone;
    } catch {
      // Fallback to UTC if timezone detection fails
      config.headers['X-Timezone'] = 'UTC';
    }
    
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling authentication errors
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as CustomAxiosRequestConfig | undefined;

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !shouldSkipRefresh(originalRequest.url)) {
      originalRequest._retry = true;

      try {
        await refreshAccessToken();
        return api(originalRequest);
      } catch (refreshError) {
        clearAuthState();
        return Promise.reject(refreshError);
      }
    }

    if (error.response?.status === 401) {
      clearAuthState();
    }
    
    return Promise.reject(error);
  }
);

export default api; 

import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { clearAuthState } from '@/features/auth/hooks/useAuth';

// Extend the AxiosRequestConfig type to include our custom properties
interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

// Create base axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
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
    } catch (error) {
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
    // Handle 401 errors (authentication failures)
    if (error.response?.status === 401) {
      // Clear auth state and redirect to login
      clearAuthState();
      
      // Redirect to login if not already there
      if (window.location.pathname !== '/auth/login') {
        window.location.href = '/auth/login';
      }
    }
    
    return Promise.reject(error);
  }
);

export default api; 
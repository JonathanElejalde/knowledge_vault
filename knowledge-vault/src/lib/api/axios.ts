import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { authApi } from '@/features/auth/api/auth.api';

// Extend the AxiosRequestConfig type to include our custom properties
interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

// Create base axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Flag to prevent multiple refresh attempts
let isRefreshing = false;
// Queue for requests that need to wait for token refresh
let refreshSubscribers: ((token: string) => void)[] = [];

// Function to add a request to the queue
const addRefreshSubscriber = (callback: (token: string) => void) => {
  refreshSubscribers.push(callback);
};

// Function to execute all queued requests with the new token
const onRefreshComplete = (token: string) => {
  refreshSubscribers.forEach(callback => callback(token));
  refreshSubscribers = [];
};

// Request interceptor for adding auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const tokens = authApi.getStoredTokens();
    if (tokens?.access_token) {
      config.headers.Authorization = `Bearer ${tokens.access_token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling common errors
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as CustomAxiosRequestConfig;
    
    // If there's no original request or it's already been retried, reject
    if (!originalRequest || originalRequest._retry) {
      return Promise.reject(error);
    }

    // If the error is 401 and we're not already refreshing
    if (error.response?.status === 401 && !isRefreshing) {
      isRefreshing = true;
      originalRequest._retry = true;

      try {
        const tokens = authApi.getStoredTokens();
        if (!tokens?.refresh_token) {
          throw new Error('No refresh token available');
        }

        // Try to refresh the token
        const response = await authApi.refreshToken(tokens.refresh_token);
        authApi.saveTokens(response);

        // Update the authorization header
        originalRequest.headers.Authorization = `Bearer ${response.access_token}`;

        // Execute all queued requests with the new token
        onRefreshComplete(response.access_token);

        // Return the original request with the new token
        return api(originalRequest);
      } catch (refreshError) {
        // If refresh fails, clear tokens and redirect to login
        authApi.logout(authApi.getStoredTokens()?.refresh_token || '');
        window.location.href = '/auth/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // If we're already refreshing, add the request to the queue
    if (isRefreshing) {
      return new Promise((resolve) => {
        addRefreshSubscriber((token: string) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          resolve(api(originalRequest));
        });
      });
    }

    return Promise.reject(error);
  }
);

export default api; 
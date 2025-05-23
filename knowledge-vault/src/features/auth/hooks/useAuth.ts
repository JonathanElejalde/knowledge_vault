import { create } from 'zustand';
import { authApi } from '../api/auth.api';
import type {
  LoginCredentials,
  SignupCredentials,
  AuthState,
  AuthActions,
  AuthStore,
  User,
} from '../types/auth.types';

// Flag to prevent multiple auth initializations
let isInitializing = false;

// Create the store
const authStore = create<AuthStore>((set, get) => ({
  user: null,
  token: null,
  refreshToken: null,
  tokenExpiry: null,
  isLoading: true,
  error: null,
  isAuthenticated: false,
  isRefreshing: false,

  initializeAuth: async () => {
    // Prevent multiple initializations
    if (isInitializing) {
      return;
    }
    isInitializing = true;

    try {
      const tokens = authApi.getStoredTokens();
      if (!tokens) {
        set({ 
          isLoading: false,
          isAuthenticated: false,
          user: null,
          token: null,
          refreshToken: null,
          tokenExpiry: null,
        });
        return;
      }

      if (authApi.isTokenExpired(tokens.expires_at)) {
        try {
          const response = await authApi.refreshToken(tokens.refresh_token);
          authApi.saveTokens(response);
          set({
            token: response.access_token,
            refreshToken: response.refresh_token,
            tokenExpiry: Date.now() + response.expires_in * 1000,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          // Clear everything on refresh failure
          localStorage.removeItem('auth_tokens');
          set({
            user: null,
            token: null,
            refreshToken: null,
            tokenExpiry: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      } else {
        try {
          const user = await authApi.getCurrentUser();
          set({
            user,
            token: tokens.access_token,
            refreshToken: tokens.refresh_token,
            tokenExpiry: tokens.expires_at,
            isAuthenticated: true,
            isLoading: false,
          });
                  } catch (error) {
            // Clear everything on user fetch failure
            localStorage.removeItem('auth_tokens');
            set({
              user: null,
              token: null,
              refreshToken: null,
              tokenExpiry: null,
              isAuthenticated: false,
              isLoading: false,
            });
          }
      }
    } catch (error) {
      // Clear everything on any error
      localStorage.removeItem('auth_tokens');
      set({
        user: null,
        token: null,
        refreshToken: null,
        tokenExpiry: null,
        isAuthenticated: false,
        isLoading: false,
      });
    } finally {
      isInitializing = false;
    }
  },

  login: async (credentials: LoginCredentials) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authApi.login(credentials);
      authApi.saveTokens(response);
      set({
        token: response.access_token,
        refreshToken: response.refresh_token,
        tokenExpiry: Date.now() + response.expires_in * 1000,
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Login failed',
        isLoading: false,
        isAuthenticated: false,
      });
      throw error;
    }
  },

  signup: async (credentials: SignupCredentials) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authApi.signup(credentials);
      authApi.saveTokens(response);
      set({
        token: response.access_token,
        refreshToken: response.refresh_token,
        tokenExpiry: Date.now() + response.expires_in * 1000,
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Signup failed',
        isLoading: false,
        isAuthenticated: false,
      });
      throw error;
    }
  },

  logout: async () => {
    const { refreshToken } = get();
    if (refreshToken) {
      await authApi.logout(refreshToken);
    }
    set({
      user: null,
      token: null,
      refreshToken: null,
      tokenExpiry: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },

  clearError: () => {
    set({ error: null });
  },

  refreshAuthToken: async () => {
    const { refreshToken } = get();
    if (!refreshToken) {
      set({ isAuthenticated: false });
      return;
    }

    set({ isRefreshing: true });
    try {
      const response = await authApi.refreshToken(refreshToken);
      authApi.saveTokens(response);
      set({
        token: response.access_token,
        refreshToken: response.refresh_token,
        tokenExpiry: Date.now() + response.expires_in * 1000,
        isAuthenticated: true,
        isRefreshing: false,
      });
    } catch (error) {
      authApi.logout(refreshToken);
      set({
        user: null,
        token: null,
        refreshToken: null,
        tokenExpiry: null,
        isAuthenticated: false,
        isRefreshing: false,
      });
    }
  },
}));

// Export the hook for use in React components
export const useAuth = authStore;

// Export the store instance for use outside React components
export const authStoreInstance = authStore;

// Helper function to clear auth state from outside React (for axios interceptor)
export const clearAuthState = () => {
  // Always clear localStorage
  localStorage.removeItem('auth_tokens');
  
  // Directly update store state without API call
  authStoreInstance.setState({
    user: null,
    token: null,
    refreshToken: null,
    tokenExpiry: null,
    isAuthenticated: false,
    isLoading: false,
    isRefreshing: false,
    error: null,
  });
};

// Utility function to forcefully reset everything (for debugging)
export const forceResetAuth = () => {
  // Clear all possible auth-related localStorage keys
  localStorage.removeItem('auth_tokens');
  localStorage.clear(); // Nuclear option - clears everything
  
  // Reset store state
  authStoreInstance.setState({
    user: null,
    token: null,
    refreshToken: null,
    tokenExpiry: null,
    isAuthenticated: false,
    isLoading: false,
    isRefreshing: false,
    error: null,
  });
  
  // Reload the page to start fresh
  window.location.href = '/auth/login';
}; 
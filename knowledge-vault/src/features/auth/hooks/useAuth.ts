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

export const useAuth = create<AuthStore>((set, get) => ({
  user: null,
  token: null,
  refreshToken: null,
  tokenExpiry: null,
  isLoading: true,
  error: null,
  isAuthenticated: false,
  isRefreshing: false,

  initializeAuth: async () => {
    const tokens = authApi.getStoredTokens();
    if (!tokens) {
      set({ isLoading: false });
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
        authApi.logout(tokens.refresh_token);
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
        authApi.logout(tokens.refresh_token);
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
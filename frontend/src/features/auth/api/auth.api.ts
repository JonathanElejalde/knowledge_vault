import api from '@/lib/api/axios';
import type {
  LoginCredentials,
  SignupCredentials,
  AuthResponse,
  ApiError,
  ApiValidationError,
} from '../types/auth.types';

const TOKEN_STORAGE_KEY = 'auth_tokens';

export const authApi = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const formData = new URLSearchParams();
    formData.append('username', credentials.username);
    formData.append('password', credentials.password);
    if (credentials.remember_me) {
      formData.append('remember_me', 'true');
    }

    const response = await api.post<AuthResponse>('/auth/login/access-token', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    return response.data;
  },

  signup: async (credentials: SignupCredentials): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/register', credentials);
    return response.data;
  },

  refreshToken: async (refreshToken: string): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/refresh-token', {
      refresh_token: refreshToken,
    }, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return response.data;
  },

  getCurrentUser: async (): Promise<AuthResponse['user']> => {
    const response = await api.get<AuthResponse['user']>('/auth/me');
    return response.data;
  },

  logout: async (refreshToken: string) => {
    try {
      await api.post('/auth/logout', {
        refresh_token: refreshToken,
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } finally {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  },

  // Token storage helpers
  saveTokens: (tokens: AuthResponse) => {
    const tokenData = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: Date.now() + tokens.expires_in * 1000,
    };
    localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokenData));
  },

  getStoredTokens: () => {
    const tokens = localStorage.getItem(TOKEN_STORAGE_KEY);
    return tokens ? JSON.parse(tokens) : null;
  },

  isTokenExpired: (expiryTime: number) => {
    return Date.now() >= expiryTime;
  },
}; 
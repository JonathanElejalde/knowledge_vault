import api from '@/lib/api/axios';
import type {
  LoginCredentials,
  SignupCredentials,
  User,
  ApiError,
  ApiValidationError,
} from '../types/auth.types';

export const authApi = {
  login: async (credentials: LoginCredentials): Promise<User> => {
    const formData = new URLSearchParams();
    formData.append('username', credentials.username);
    formData.append('password', credentials.password);
    if (credentials.remember_me) {
      formData.append('remember_me', 'true');
    }

    const response = await api.post<User>('/auth/login/access-token', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    return response.data;
  },

  signup: async (credentials: SignupCredentials): Promise<User> => {
    const response = await api.post<User>('/auth/register', credentials);
    return response.data;
  },

  refreshToken: async (): Promise<User> => {
    const response = await api.post<User>('/auth/refresh-token');
    return response.data;
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await api.get<User>('/auth/me');
    return response.data;
  },

  logout: async (): Promise<void> => {
    await api.post('/auth/logout');
  },
}; 
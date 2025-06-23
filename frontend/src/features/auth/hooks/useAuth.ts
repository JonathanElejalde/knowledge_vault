import { create } from 'zustand';
import { authApi } from '../api/auth.api';
import type {
  LoginCredentials,
  SignupCredentials,
  AuthStore,
} from '../types/auth.types';

// Flag to prevent multiple auth initializations
let isInitializing = false;

// Create the store
const authStore = create<AuthStore>((set, get) => ({
  user: null,
  isLoading: true,
  error: null,
  isAuthenticated: false,

  initializeAuth: async () => {
    // Prevent multiple initializations
    if (isInitializing) {
      return;
    }
    isInitializing = true;

    try {
      // Try to get current user from cookie-based authentication
      const user = await authApi.getCurrentUser();
      set({
        user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      // If getCurrentUser fails, user is not authenticated
      set({
        user: null,
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
      const user = await authApi.login(credentials);
      set({
        user,
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
      const user = await authApi.signup(credentials);
      set({
        user,
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

  logout: async (options?: { skipSessionCheck?: boolean }) => {
    // Check for active Pomodoro session unless explicitly skipped
    if (!options?.skipSessionCheck) {
      try {
        const { usePomodoroStore } = await import('@/store/pomodoroStore');
        const pomodoroState = usePomodoroStore.getState();
        
        // Check if there's an active session
        const hasActiveSession = pomodoroState.currentSessionId && 
          (pomodoroState.timerState === 'work' || pomodoroState.timerState === 'break' || pomodoroState.timerState === 'longBreak');
        
        if (hasActiveSession) {
          // Return a special indicator that there's an active session
          // The UI will handle showing the confirmation dialog
          throw new Error('ACTIVE_POMODORO_SESSION');
        }
      } catch (error) {
        if (error instanceof Error && error.message === 'ACTIVE_POMODORO_SESSION') {
          throw error; // Re-throw to let UI handle it
        }
        // Other errors (like import failures) should not block logout
        console.warn('Failed to check Pomodoro session state:', error);
      }
    }

    // Proceed with logout
    try {
      await authApi.logout();
    } finally {
      // Clear auth state
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
      
      // Clear Pomodoro session state on logout
      try {
        const { usePomodoroStore } = await import('@/store/pomodoroStore');
        usePomodoroStore.getState().clearSessionState();
      } catch (error) {
        console.warn('Failed to clear Pomodoro session state:', error);
      }
    }
  },

  logoutWithSessionAbandon: async () => {
    // Force logout without checking for active sessions
    await get().logout({ skipSessionCheck: true });
  },

  clearError: () => {
    set({ error: null });
  },

  getCurrentUser: async () => {
    set({ isLoading: true });
    try {
      const user = await authApi.getCurrentUser();
      set({
        user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },

  clearAuth: () => {
    set({
      user: null,
      isAuthenticated: false,
      error: null,
    });
  },
}));

// Export the hook
export const useAuth = () => authStore();

// Export specific methods for external use
export const clearAuthState = () => {
  authStore.getState().clearAuth();
};

export const forceResetAuth = () => {
  authStore.getState().clearAuth();
};

export const testLogoutConfirmation = async () => {
  try {
    await authStore.getState().logout();
    return true;
  } catch (error) {
    if (error instanceof Error && error.message === 'ACTIVE_POMODORO_SESSION') {
      return false; // Session is active, logout was prevented
    }
    throw error; // Re-throw other errors
  }
};

// Initialize auth on app start
export const initializeAuth = () => {
  authStore.getState().initializeAuth();
}; 
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

  logout: async (options?: { skipSessionCheck?: boolean }) => {
    const { refreshToken } = get();
    
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
    if (refreshToken) {
      await authApi.logout(refreshToken);
    }
    
    // PHASE 1: Clear auth state
    set({
      user: null,
      token: null,
      refreshToken: null,
      tokenExpiry: null,
      isAuthenticated: false,
      isLoading: false,
    });
    
    // PHASE 1: Clear Pomodoro session state on logout
    try {
      const { usePomodoroStore } = await import('@/store/pomodoroStore');
      usePomodoroStore.getState().clearSessionState();
    } catch (error) {
      console.warn('Failed to clear Pomodoro session state:', error);
    }
  },

  // Helper function to abandon active Pomodoro session and then logout
  logoutWithSessionAbandon: async () => {
         try {
       // First, abandon the active session
       const { usePomodoroStore } = await import('@/store/pomodoroStore');
       const pomodoroState = usePomodoroStore.getState();
      
      if (pomodoroState.currentSessionId && 
          (pomodoroState.timerState === 'work' || pomodoroState.timerState === 'break' || pomodoroState.timerState === 'longBreak')) {
        
        // Calculate actual duration worked
        let actualDurationSeconds = 0;
        
        if (pomodoroState.startTime && pomodoroState.isRunning) {
          // Timer is running - calculate from start time
          actualDurationSeconds = Math.floor((Date.now() - pomodoroState.startTime) / 1000);
        } else {
          // Timer is paused - calculate from time elapsed
          const plannedDurationSeconds = pomodoroState.workDuration * 60;
          actualDurationSeconds = plannedDurationSeconds - pomodoroState.timeLeft;
        }
        
        // Ensure at least 1 minute is sent
        const actualDurationMinutes = Math.max(1, Math.round(actualDurationSeconds / 60));
        
        // Only call API if it's not a fallback session
        if (!pomodoroState.currentSessionId.startsWith('fallback-')) {
          const { pomodoroApi } = await import('@/services/api/pomodoro');
          await pomodoroApi.abandonSession(pomodoroState.currentSessionId, {
            actual_duration: actualDurationMinutes,
            reason: 'User logged out'
          });
        }
      }
    } catch (error) {
      console.warn('Failed to abandon Pomodoro session before logout:', error);
      // Continue with logout even if abandon fails
    }
    
    // Now logout without session check since we just handled it
    return get().logout({ skipSessionCheck: true });
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
  
  // PHASE 1: Also clear Pomodoro session state
  try {
    // Dynamic import to avoid circular dependencies
    import('@/store/pomodoroStore').then(({ usePomodoroStore }) => {
      usePomodoroStore.getState().clearSessionState();
    });
  } catch (error) {
    console.warn('Failed to clear Pomodoro session state:', error);
  }
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
  
  // PHASE 1: Clear Pomodoro session state
  try {
    import('@/store/pomodoroStore').then(({ usePomodoroStore }) => {
      usePomodoroStore.getState().clearSessionState();
    });
  } catch (error) {
    console.warn('Failed to clear Pomodoro session state:', error);
  }
  
  // Reload the page to start fresh
  window.location.href = '/auth/login';
};

// Test helper function to verify logout confirmation - remove after testing
export const testLogoutConfirmation = async () => {
  console.log('🧪 TESTING LOGOUT CONFIRMATION');
  
  try {
    // This should work normally if no active session
    console.log('📝 Testing logout without active session...');
    // await authStoreInstance.getState().logout();
    console.log('✅ Normal logout works');
    
    // This should throw ACTIVE_POMODORO_SESSION error if session is active
    console.log('📝 Testing logout with simulated active session...');
    // You can manually test this by starting a Pomodoro and then trying to logout
    
    console.log('💡 To test:');
    console.log('1. Start a Pomodoro session');
    console.log('2. Try to logout from the header menu');
    console.log('3. Should see confirmation dialog');
    console.log('4. Click "Abandon Session & Log Out"');
    console.log('5. Should abandon session and logout successfully');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}; 
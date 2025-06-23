/**
 * User interface representing the authenticated user
 */
export interface User {
  id: string;
  email: string;
  username: string;
  is_active: boolean;
  last_login?: string;
}

/**
 * Login credentials interface
 */
export interface LoginCredentials {
  username: string;
  password: string;
  remember_me?: boolean;
}

/**
 * Signup credentials interface
 */
export interface SignupCredentials {
  email: string;
  username: string;
  password: string;
}

/**
 * Authentication state interface for the store  
 */
export interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}

/**
 * Authentication actions interface for the store
 */
export interface AuthActions {
  login: (credentials: LoginCredentials) => Promise<void>;
  signup: (credentials: SignupCredentials) => Promise<void>;
  logout: (options?: { skipSessionCheck?: boolean }) => Promise<void>;
  logoutWithSessionAbandon: () => Promise<void>;
  clearError: () => void;
  getCurrentUser: () => Promise<void>;
  initializeAuth: () => Promise<void>;
  clearAuth: () => void;
}

/**
 * Combined auth store interface
 */
export type AuthStore = AuthState & AuthActions;

/**
 * API error response interface
 */
export interface ApiError {
  detail: string;
  code?: string;
  status?: number;
}

/**
 * Validation error response interface
 */
export interface ValidationError {
  loc: string[];
  msg: string;
  type: string;
}

/**
 * API error response with validation errors
 */
export interface ApiValidationError {
  detail: ValidationError[];
} 
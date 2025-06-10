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
 * Authentication response from the API
 */
export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

/**
 * Token storage interface
 */
export interface TokenStorage {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

/**
 * Authentication state interface for the store
 */
export interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  tokenExpiry: number | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  isRefreshing: boolean;
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
  refreshAuthToken: () => Promise<void>;
  initializeAuth: () => Promise<void>;
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
import type { User, Session } from '@supabase/supabase-js';

export interface AuthUser extends User {
  user_metadata: {
    avatar_url?: string;
    email?: string;
    email_verified?: boolean;
    full_name?: string;
    iss?: string;
    name?: string;
    picture?: string;
    provider_id?: string;
    sub?: string;
  };
}

export interface AuthSession extends Session {
  user: AuthUser;
}

export interface AuthError {
  message: string;
  status?: number;
  code?: string;
}

export interface AuthState {
  user: AuthUser | null;
  session: AuthSession | null;
  loading: boolean;
  error: AuthError | null;
  isAuthenticated: boolean;
}

export interface LoginOptions {
  redirectTo?: string;
  scopes?: string;
}

export interface LogoutOptions {
  redirectTo?: string;
}

export interface RefreshTokenOptions {
  refreshToken?: string;
}

export interface AuthContextValue extends AuthState {
  signIn: (options?: LoginOptions) => Promise<void>;
  signOut: (options?: LogoutOptions) => Promise<void>;
  refreshSession: (options?: RefreshTokenOptions) => Promise<void>;
  clearError: () => void;
}

// OAuth provider types
export type OAuthProvider = 'google' | 'github' | 'discord' | 'spotify';

export interface OAuthConfig {
  provider: OAuthProvider;
  scopes?: string[];
  redirectTo?: string;
  queryParams?: Record<string, string>;
}

// Auth event types
export type AuthEvent = 
  | 'SIGNED_IN' 
  | 'SIGNED_OUT' 
  | 'TOKEN_REFRESHED' 
  | 'USER_UPDATED' 
  | 'PASSWORD_RECOVERY';

export interface AuthEventPayload {
  event: AuthEvent;
  session: AuthSession | null;
}

// Route protection types
export interface ProtectedRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
  requiredRole?: string;
  fallback?: React.ReactNode;
}

export interface PublicRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
  fallback?: React.ReactNode;
}
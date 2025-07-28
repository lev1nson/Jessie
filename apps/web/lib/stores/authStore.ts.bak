import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { User, Session } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  retryCount: number;
}

interface AuthActions {
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  incrementRetryCount: () => void;
  resetRetryCount: () => void;
  reset: () => void;
  updateUserProfile: (updates: Partial<User['user_metadata']>) => void;
}

const initialState: AuthState = {
  user: null,
  session: null,
  loading: false,
  error: null,
  isAuthenticated: false,
  retryCount: 0,
};

export const useAuthStore = create<AuthState & AuthActions>()(
  devtools(
    (set) => ({
      ...initialState,

      setUser: (user) => 
        set(() => ({
          user,
          isAuthenticated: !!user,
        }), false, 'setUser'),

      setSession: (session) => 
        set(() => ({
          session,
          user: session?.user || null,
          isAuthenticated: !!session?.user,
        }), false, 'setSession'),

      setLoading: (loading) => 
        set({ loading }, false, 'setLoading'),

      setError: (error) => 
        set({ error }, false, 'setError'),

      clearError: () => 
        set({ error: null, retryCount: 0 }, false, 'clearError'),

      incrementRetryCount: () => 
        set((state) => ({ 
          retryCount: state.retryCount + 1 
        }), false, 'incrementRetryCount'),

      resetRetryCount: () => 
        set({ retryCount: 0 }, false, 'resetRetryCount'),

      reset: () => 
        set(initialState, false, 'reset'),

      updateUserProfile: (updates) => 
        set((state) => {
          if (!state.user) return state;
          
          return {
            user: {
              ...state.user,
              user_metadata: {
                ...state.user.user_metadata,
                ...updates,
              },
            },
          };
        }, false, 'updateUserProfile'),
    }),
    { name: 'auth-store' }
  )
);

// Selectors for specific parts of the state
export const useAuthUser = () => useAuthStore((state) => state.user);
export const useAuthSession = () => useAuthStore((state) => state.session);
export const useAuthLoading = () => useAuthStore((state) => state.loading);
export const useAuthError = () => useAuthStore((state) => state.error);
export const useIsAuthenticated = () => useAuthStore((state) => state.isAuthenticated);
export const useAuthRetryCount = () => useAuthStore((state) => state.retryCount);

// Action selectors
export const useAuthActions = () => useAuthStore((state) => ({
  setUser: state.setUser,
  setSession: state.setSession,
  setLoading: state.setLoading,
  setError: state.setError,
  clearError: state.clearError,
  incrementRetryCount: state.incrementRetryCount,
  resetRetryCount: state.resetRetryCount,
  reset: state.reset,
  updateUserProfile: state.updateUserProfile,
}));
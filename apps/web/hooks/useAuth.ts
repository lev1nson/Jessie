'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClientSupabaseClient } from '../lib/auth';
import type { User, Session } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
}

interface AuthMethods {
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  clearError: () => void;
}

export function useAuth(): AuthState & AuthMethods {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    error: null,
  });

  const supabase = useMemo(() => createClientSupabaseClient(), []);

  // Get initial session
  useEffect(() => {
    const getSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          setState(prev => ({
            ...prev,
            error: error.message,
            loading: false,
          }));
          return;
        }

        setState(prev => ({
          ...prev,
          user: session?.user ?? null,
          session,
          loading: false,
          error: null,
        }));
      } catch (error) {
        setState(prev => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Failed to get session',
          loading: false,
        }));
      }
    };

    getSession();
  }, [supabase.auth]);

  // Listen for auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setState(prev => ({
          ...prev,
          user: session?.user ?? null,
          session,
          loading: false,
          error: null,
        }));

        // Handle specific auth events
        if (event === 'SIGNED_OUT') {
          setState(prev => ({
            ...prev,
            user: null,
            session: null,
            error: null,
          }));
        }

        if (event === 'TOKEN_REFRESHED') {
          console.log('Token refreshed successfully');
        }

        if (event === 'SIGNED_IN') {
          console.log('User signed in successfully');
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  // Sign out method
  const signOut = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      // Call our logout API to handle server-side cleanup
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Logout failed');
      }

      // The auth state change will be handled by the listener
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to sign out',
        loading: false,
      }));
    }
  }, []);

  // Refresh session method
  const refresh = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const { data: { session }, error } = await supabase.auth.refreshSession();
      
      if (error) {
        throw error;
      }

      setState(prev => ({
        ...prev,
        user: session?.user ?? null,
        session,
        loading: false,
        error: null,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to refresh session',
        loading: false,
      }));
    }
  }, [supabase.auth]);

  // Clear error method
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    signOut,
    refresh,
    clearError,
  };
}
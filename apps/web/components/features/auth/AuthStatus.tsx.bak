'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { createClientSupabaseClient } from '../../../lib/auth-client';
import { cn } from '@jessie/ui';
import { ErrorAlert } from '../../ui/ErrorAlert';
import type { User } from '@supabase/supabase-js';

interface AuthStatusProps {
  className?: string;
  showLogout?: boolean;
  onLogout?: () => void;
}

export function AuthStatus({ 
  className, 
  showLogout = true,
  onLogout 
}: AuthStatusProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const supabase = createClientSupabaseClient();

    // Get initial session
    const getSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user ?? null);
      } catch (error) {
        console.error('Error getting session:', error);
      } finally {
        setLoading(false);
      }
    };

    getSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async (isRetry = false) => {
    try {
      setLoggingOut(true);
      setError(null);
      
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      });

      if (response.ok) {
        onLogout?.();
        // Redirect to home page
        window.location.href = '/';
      } else {
        throw new Error('Logout failed');
      }
    } catch (error) {
      console.error('Logout error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to logout. Please try again.';
      
      if (isRetry) {
        setRetryCount(prev => prev + 1);
      }
      
      setError(errorMessage);
    } finally {
      setLoggingOut(false);
    }
  };

  const handleRetryLogout = () => {
    if (retryCount < 3) {
      handleLogout(true);
    } else {
      setError('Maximum retry attempts reached. Please refresh the page and try again.');
    }
  };

  const handleDismissError = () => {
    setError(null);
    setRetryCount(0);
  };

  if (loading) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
        <span className="text-sm text-gray-600">Loading...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={cn('text-sm text-gray-600', className)}>
        Not signed in
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="flex items-center gap-2">
        {user.user_metadata?.avatar_url && (
          <Image
            src={user.user_metadata.avatar_url}
            alt={user.user_metadata?.full_name || user.email || 'User'}
            width={32}
            height={32}
            className="w-8 h-8 rounded-full border border-gray-200"
          />
        )}
        <div className="flex flex-col">
          <span className="text-sm font-medium text-gray-900">
            {user.user_metadata?.full_name || user.email}
          </span>
          <span className="text-xs text-gray-500">
            {user.email}
          </span>
        </div>
      </div>
      
      {showLogout && (
        <button
          onClick={() => handleLogout()}
          disabled={loggingOut}
          className={cn(
            'px-3 py-1.5 text-xs font-medium',
            'bg-gray-100 hover:bg-gray-200 text-gray-700',
            'border border-gray-300 rounded-md',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'transition-colors duration-200',
            'focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-1'
          )}
        >
          {loggingOut ? 'Signing out...' : 'Sign out'}
        </button>
      )}
      
      <ErrorAlert
        message={error}
        onDismiss={handleDismissError}
        onRetry={retryCount < 3 ? handleRetryLogout : undefined}
      />
    </div>
  );
}
'use client';

import { useState } from 'react';
import { cn } from '@jessie/ui';
import { ErrorAlert } from '../../ui/ErrorAlert';

interface GoogleLoginButtonProps {
  className?: string;
  onLoading?: (loading: boolean) => void;
  redirectTo?: string;
}

export function GoogleLoginButton({ 
  className, 
  onLoading,
  redirectTo 
}: GoogleLoginButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const handleGoogleLogin = async (isRetry = false) => {
    try {
      setIsLoading(true);
      setError(null);
      onLoading?.(true);

      console.log('Initiating Google login request...');

      const response = await fetch('/api/auth/google/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          redirectTo: redirectTo || window.location.origin + '/auth/callback',
        }),
      });

      console.log('Response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response error:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('Response data:', data);

      if (data.url) {
        console.log('Redirecting to:', data.url);
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'No redirect URL received');
      }
    } catch (error) {
      console.error('Login error details:', {
        error,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        type: typeof error,
        isNetworkError: error instanceof TypeError && error.message.includes('fetch')
      });
      
      let errorMessage: string;
      if (error instanceof TypeError && error.message.includes('fetch')) {
        errorMessage = 'Network error: Unable to connect to authentication service. Please check your connection and try again.';
      } else if (error instanceof Error) {
        errorMessage = error.message;
      } else {
        errorMessage = 'Failed to login. Please try again.';
      }
      
      if (isRetry) {
        setRetryCount(prev => prev + 1);
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
      onLoading?.(false);
    }
  };

  const handleRetry = () => {
    if (retryCount < 3) {
      handleGoogleLogin(true);
    } else {
      setError('Maximum retry attempts reached. Please refresh the page and try again.');
    }
  };

  const handleDismissError = () => {
    setError(null);
    setRetryCount(0);
  };

  return (
    <>
      <button
        onClick={() => handleGoogleLogin()}
        disabled={isLoading}
        className={cn(
          'flex items-center justify-center gap-3 w-full px-4 py-3',
          'bg-white border border-gray-300 rounded-lg shadow-sm',
          'hover:bg-gray-50 hover:shadow-md transition-all duration-200',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
          'text-gray-700 font-medium text-sm',
          className
        )}
      >
        {isLoading ? (
          <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
        ) : (
          <svg
            className="w-5 h-5"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
        )}
        {isLoading ? 'Signing in...' : 'Continue with Google'}
      </button>
      
      <ErrorAlert
        message={error}
        onDismiss={handleDismissError}
        onRetry={retryCount < 3 ? handleRetry : undefined}
      />
    </>
  );
}
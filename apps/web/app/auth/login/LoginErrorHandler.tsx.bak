'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { cn } from '@jessie/ui';

const ERROR_MESSAGES: Record<string, string> = {
  oauth_failed: 'Authentication failed. Please try again.',
  server_error: 'Server error occurred. Please try again later.',
  no_code: 'Authorization code not received. Please try again.',
  session_failed: 'Failed to create session. Please try again.',
  no_session: 'Session could not be established. Please try again.',
  access_denied: 'Access was denied. Please try again.',
  logout_failed: 'Logout failed. Please try again.',
};

export function LoginErrorHandler() {
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam) {
      const errorMessage = ERROR_MESSAGES[errorParam] || 'An unexpected error occurred. Please try again.';
      setError(errorMessage);
      setIsVisible(true);

      // Auto-hide error after 10 seconds
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => setError(null), 300); // Wait for animation to complete
      }, 10000);

      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => setError(null), 300); // Wait for animation to complete
  };

  if (!error) {
    return null;
  }

  return (
    <div
      className={cn(
        'fixed top-4 right-4 max-w-md w-full z-50 transition-all duration-300 transform',
        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      )}
    >
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-red-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-red-800">
              Authentication Error
            </h3>
            <div className="mt-1 text-sm text-red-700">
              {error}
            </div>
          </div>
          <div className="ml-4 flex-shrink-0">
            <button
              onClick={handleDismiss}
              className="inline-flex text-red-400 hover:text-red-600 focus:outline-none focus:text-red-600 transition-colors duration-200"
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
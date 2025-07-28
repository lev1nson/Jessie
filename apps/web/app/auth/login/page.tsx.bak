import { Suspense } from 'react';
import { GoogleLoginButton } from '../../../components/features/auth/GoogleLoginButton';
import { LoginErrorHandler } from './LoginErrorHandler';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome to Jessie
          </h1>
          <p className="text-gray-600 mb-8">
            Your AI-powered email assistant. Sign in to get started.
          </p>
        </div>

        <div className="bg-white py-8 px-6 shadow-lg rounded-lg border border-gray-200">
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Sign in to your account
              </h2>
              
              <GoogleLoginButton className="w-full" />
            </div>

            <div className="text-center">
              <p className="text-xs text-gray-500">
                By signing in, you agree to our terms of service and privacy policy.
              </p>
            </div>
          </div>
        </div>

        <div className="text-center text-sm text-gray-600">
          <p>
            Need help?{' '}
            <a 
              href="mailto:support@jessie-app.com" 
              className="text-blue-600 hover:text-blue-500 font-medium"
            >
              Contact support
            </a>
          </p>
        </div>

        <Suspense fallback={<div>Loading...</div>}>
          <LoginErrorHandler />
        </Suspense>
      </div>
    </div>
  );
}
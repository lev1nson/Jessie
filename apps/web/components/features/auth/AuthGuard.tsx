'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientSupabaseClient } from '../../../lib/auth';
import type { User } from '@supabase/supabase-js';

interface AuthGuardProps {
  children: React.ReactNode;
  redirectTo?: string;
  requireAuth?: boolean;
}

export function AuthGuard({ 
  children, 
  redirectTo = '/auth/login',
  requireAuth = true 
}: AuthGuardProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClientSupabaseClient();

    const getSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user ?? null);
        
        if (requireAuth && !session?.user) {
          router.push(redirectTo);
        } else if (!requireAuth && session?.user) {
          // If auth is not required and user is logged in, redirect to dashboard
          router.push('/dashboard');
        }
      } catch (error) {
        console.error('Error getting session:', error);
        if (requireAuth) {
          router.push(redirectTo);
        }
      } finally {
        setLoading(false);
      }
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        
        if (requireAuth && !session?.user) {
          router.push(redirectTo);
        } else if (!requireAuth && session?.user) {
          router.push('/dashboard');
        }
        
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [router, redirectTo, requireAuth]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
          <span className="text-gray-600">Loading...</span>
        </div>
      </div>
    );
  }

  if (requireAuth && !user) {
    return null; // Will redirect via useEffect
  }

  if (!requireAuth && user) {
    return null; // Will redirect via useEffect
  }

  return <>{children}</>;
}
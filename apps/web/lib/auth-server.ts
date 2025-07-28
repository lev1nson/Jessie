import { createServerClient, createBrowserClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  // Don't throw in production to prevent breaking the app
  // throw new Error('Missing Supabase environment variables');
}

// Server-side Supabase client for server components
export const createServerSupabaseClient = () => {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Supabase not configured');
    return null;
  }
  
  const cookieStore = cookies();
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });
};

// Middleware for API routes
export const createSupabaseMiddleware = () => {
  const res = NextResponse.next();
  const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
  return { supabase, res };
};

// Auth validation schemas
export const GoogleAuthSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string().optional(),
  expires_in: z.number(),
  scope: z.string(),
  token_type: z.string(),
});

export const UserProfileSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  picture: z.string().url().optional(),
});

export type GoogleAuthTokens = z.infer<typeof GoogleAuthSchema>;
export type UserProfile = z.infer<typeof UserProfileSchema>;

// Helper function to get user session
export const getServerSession = async () => {
  const supabase = createServerSupabaseClient();
  if (!supabase) {
    return null;
  }
  
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error) {
    console.error('Error getting session:', error);
    return null;
  }
  
  return session;
};

// Helper function to get user profile
export const getUserProfile = async () => {
  const supabase = createServerSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error) {
    console.error('Error getting user:', error);
    return null;
  }
  
  return user;
};
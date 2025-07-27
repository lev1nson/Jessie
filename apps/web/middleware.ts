import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  
  // Check if Supabase environment variables are available
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  // Skip authentication if environment variables are not properly configured
  if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('placeholder')) {
    console.warn('Supabase credentials not configured. Skipping authentication middleware.');
    return res;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  try {
    // Refresh session if expired - required for Server Components
    const { data: { session } } = await supabase.auth.getSession();

    // Protected routes that require authentication
    const protectedRoutes = ['/dashboard', '/emails', '/chat'];
    const isProtectedRoute = protectedRoutes.some(route => 
      req.nextUrl.pathname.startsWith(route)
    );

    // Redirect to login if accessing protected route without session
    if (isProtectedRoute && !session) {
      return NextResponse.redirect(new URL('/auth/login', req.url));
    }

    // Redirect to dashboard if accessing auth pages while logged in
    if (req.nextUrl.pathname.startsWith('/auth') && session) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
  } catch (error) {
    console.warn('Authentication middleware error:', error);
    // Continue without authentication if there's an error
  }

  return res;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api/auth (auth API routes)
     */
    '/((?!_next/static|_next/image|favicon.ico|api/auth).*)',
  ],
};
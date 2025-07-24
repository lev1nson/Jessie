import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { 
  checkRateLimit, 
  getClientIP, 
  validateRedirectUrl,
  secureLog
} from '@lib/security';

const LoginRequestSchema = z.object({
  redirectTo: z.string().url().optional(),
});

const ALLOWED_DOMAINS = [
  'localhost',
  '127.0.0.1',
  process.env.NEXTAUTH_URL ? new URL(process.env.NEXTAUTH_URL).hostname : 'localhost'
];

export async function POST(request: NextRequest) {
  const clientIP = getClientIP(request);
  
  try {
    // Rate limiting
    const rateLimit = checkRateLimit(`login:${clientIP}`, 60000, 5);
    if (!rateLimit.allowed) {
      secureLog('warn', 'Rate limit exceeded for login attempt', { clientIP });
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'X-RateLimit-Reset': new Date(rateLimit.resetTime).toISOString(),
          }
        }
      );
    }

    const body = await request.json();
    const { redirectTo } = LoginRequestSchema.parse(body);
    
    // Validate redirect URL
    if (redirectTo && !validateRedirectUrl(redirectTo, ALLOWED_DOMAINS)) {
      secureLog('warn', 'Invalid redirect URL attempted', { redirectTo, clientIP });
      return NextResponse.json(
        { error: 'Invalid redirect URL' },
        { status: 400 }
      );
    }
    
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookiesToSet) => {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    const finalRedirectTo = redirectTo || `${process.env.NEXTAUTH_URL}/dashboard`;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        scopes: 'email profile https://www.googleapis.com/auth/gmail.readonly',
        redirectTo: `${process.env.NEXTAUTH_URL}/api/auth/google/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
          state: encodeURIComponent(finalRedirectTo),
        },
      },
    });

    if (error) {
      secureLog('error', 'OAuth initiation failed', { error: error.message, clientIP });
      return NextResponse.json(
        { error: 'Failed to initiate OAuth flow' },
        { status: 500 }
      );
    }

    secureLog('info', 'OAuth flow initiated', { clientIP });
    return NextResponse.json({ url: data.url });
  } catch (error) {
    secureLog('error', 'Login route error', { error: String(error), clientIP });
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const redirectTo = searchParams.get('redirectTo');
    
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookiesToSet) => {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        scopes: 'email profile https://www.googleapis.com/auth/gmail.readonly',
        redirectTo: redirectTo || `${process.env.NEXTAUTH_URL}/api/auth/google/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) {
      console.error('OAuth error:', error);
      return NextResponse.redirect(
        new URL('/auth/login?error=oauth_failed', request.url)
      );
    }

    return NextResponse.redirect(data.url);
  } catch (error) {
    console.error('Login route error:', error);
    return NextResponse.redirect(
      new URL('/auth/login?error=server_error', request.url)
    );
  }
}
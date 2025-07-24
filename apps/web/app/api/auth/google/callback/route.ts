import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { 
  checkRateLimit, 
  getClientIP, 
  validateRedirectUrl,
  UserValidationSchema,
  secureLog
} from '@lib/security';

const ALLOWED_DOMAINS = [
  'localhost',
  '127.0.0.1',
  process.env.NEXTAUTH_URL ? new URL(process.env.NEXTAUTH_URL).hostname : 'localhost'
];

export async function GET(request: NextRequest) {
  const clientIP = getClientIP(request);
  
  try {
    // Rate limiting for callback attempts
    const rateLimit = checkRateLimit(`callback:${clientIP}`, 60000, 10);
    if (!rateLimit.allowed) {
      secureLog('warn', 'Rate limit exceeded for callback', { clientIP });
      return NextResponse.redirect(
        new URL('/auth/login?error=rate_limit', request.url)
      );
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const state = searchParams.get('state');

    // Handle OAuth errors
    if (error) {
      secureLog('warn', 'OAuth callback error received', { error, clientIP });
      return NextResponse.redirect(
        new URL(`/auth/login?error=${error}`, request.url)
      );
    }

    if (!code) {
      secureLog('warn', 'No authorization code in callback', { clientIP });
      return NextResponse.redirect(
        new URL('/auth/login?error=no_code', request.url)
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

    // Exchange code for session
    const { data: sessionData, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);

    if (sessionError) {
      secureLog('error', 'Session exchange failed', { 
        error: sessionError.message, 
        clientIP 
      });
      return NextResponse.redirect(
        new URL('/auth/login?error=session_failed', request.url)
      );
    }

    const { session, user } = sessionData;

    if (!session || !user) {
      secureLog('error', 'No session or user data received', { clientIP });
      return NextResponse.redirect(
        new URL('/auth/login?error=no_session', request.url)
      );
    }

    // Validate user data from Google
    try {
      UserValidationSchema.parse({
        id: user.id,
        email: user.email,
        name: user.user_metadata?.full_name || user.user_metadata?.name,
        picture: user.user_metadata?.avatar_url || user.user_metadata?.picture,
        email_verified: user.email_confirmed_at != null,
      });
    } catch {
      secureLog('error', 'User data validation failed', { 
        userId: user.id,
        email: user.email,
        clientIP 
      });
      return NextResponse.redirect(
        new URL('/auth/login?error=invalid_user_data', request.url)
      );
    }

    // Log successful authentication
    secureLog('info', 'User authenticated successfully', {
      userId: user.id,
      email: user.email,
      provider: 'google',
      clientIP,
    });

    // Create or update user profile in public.users table
    try {
      const { error: upsertError } = await supabase
        .from('users')
        .upsert({
          id: user.id,
          email: user.email!,
          google_id: user.user_metadata.sub || user.user_metadata.provider_id,
          name: user.user_metadata.full_name || user.user_metadata.name || user.email!.split('@')[0],
          avatar_url: user.user_metadata.avatar_url || user.user_metadata.picture,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'id'
        });

      if (upsertError) {
        secureLog('warn', 'User profile upsert failed', { 
          userId: user.id,
          error: upsertError.message,
          clientIP 
        });
        // Don't fail the auth flow for profile upsert errors
      }
    } catch (profileError) {
      secureLog('warn', 'User profile update error', { 
        userId: user.id,
        error: String(profileError),
        clientIP 
      });
      // Don't fail the auth flow for profile errors
    }

    // Validate and redirect to specified URL or dashboard
    let redirectUrl = '/dashboard';
    
    if (state) {
      try {
        const decodedState = decodeURIComponent(state);
        if (validateRedirectUrl(decodedState, ALLOWED_DOMAINS)) {
          redirectUrl = decodedState;
        } else {
          secureLog('warn', 'Invalid redirect URL in state parameter', { 
            state: decodedState, 
            clientIP 
          });
        }
      } catch {
        secureLog('warn', 'Failed to decode state parameter', { 
          state, 
          clientIP 
        });
      }
    }

    return NextResponse.redirect(new URL(redirectUrl, request.url));

  } catch (error) {
    secureLog('error', 'Callback route error', { 
      error: String(error),
      clientIP 
    });
    return NextResponse.redirect(
      new URL('/auth/login?error=server_error', request.url)
    );
  }
}
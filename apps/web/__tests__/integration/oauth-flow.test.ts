import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock Supabase client
const mockSupabaseClient = {
  auth: {
    signInWithOAuth: vi.fn(),
    exchangeCodeForSession: vi.fn(),
  },
  from: vi.fn(() => ({
    upsert: vi.fn().mockResolvedValue({ error: null }),
  })),
};

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => mockSupabaseClient),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    getAll: vi.fn(() => []),
    set: vi.fn(),
  })),
}));

vi.mock('@/lib/security', () => ({
  checkRateLimit: vi.fn(),
  getClientIP: vi.fn(() => '127.0.0.1'),
  validateRedirectUrl: vi.fn(() => true),
  UserValidationSchema: {
    parse: vi.fn(),
  },
  secureLog: vi.fn(),
}));

// Integration test for the complete OAuth flow
describe('OAuth Integration Flow', () => {
  beforeEach(() => {
    // Set up environment variables
    vi.stubEnv('NEXTAUTH_URL', 'http://localhost:3000');
    vi.stubEnv('GOOGLE_CLIENT_ID', 'test-client-id');
    vi.stubEnv('GOOGLE_CLIENT_SECRET', 'test-client-secret');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon-key');
    vi.stubEnv('SUPABASE_SERVICE_KEY', 'test-service-key');
    vi.stubEnv('NEXTAUTH_SECRET', 'test-secret');
    
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  describe('Complete OAuth Flow', () => {
    it('should complete full OAuth flow successfully', async () => {
      const { checkRateLimit, UserValidationSchema } = await import('@/lib/security');
      
      // Set up mocks for successful flow
      (checkRateLimit as any).mockReturnValue({ 
        allowed: true, 
        remaining: 4, 
        resetTime: Date.now() + 60000 
      });
      
      (UserValidationSchema.parse as any).mockReturnValue(true);
      
      mockSupabaseClient.auth.signInWithOAuth.mockResolvedValue({
        data: { url: 'https://accounts.google.com/oauth/authorize?state=test' },
        error: null,
      });

      mockSupabaseClient.auth.exchangeCodeForSession.mockResolvedValue({
        data: {
          session: { 
            user: {
              id: 'user-123',
              email: 'test@example.com',
              email_confirmed_at: new Date().toISOString(),
              user_metadata: {
                full_name: 'Test User',
                avatar_url: 'https://example.com/avatar.jpg',
                sub: 'google-id-123',
              },
            },
            access_token: 'access-token',
          },
          user: {
            id: 'user-123',
            email: 'test@example.com',
            email_confirmed_at: new Date().toISOString(),
            user_metadata: {
              full_name: 'Test User',
              avatar_url: 'https://example.com/avatar.jpg',
              sub: 'google-id-123',
            },
          },
        },
        error: null,
      });

      // Step 1: Initiate OAuth flow
      const { POST: loginPost } = await import('../../app/api/auth/google/login/route');
      
      const loginRequest = new NextRequest('http://localhost:3000/api/auth/google/login', {
        method: 'POST',
        body: JSON.stringify({ redirectTo: 'http://localhost:3000/dashboard' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const loginResponse = await loginPost(loginRequest);
      const loginData = await loginResponse.json();

      expect(loginResponse.status).toBe(200);
      expect(loginData.url).toContain('accounts.google.com');

      // Step 2: Handle OAuth callback
      const { GET: callbackGet } = await import('../../app/api/auth/google/callback/route');
      
      const callbackRequest = new NextRequest(
        'http://localhost:3000/api/auth/google/callback?code=auth-code&state=http%3A//localhost%3A3000/dashboard'
      );

      const callbackResponse = await callbackGet(callbackRequest);

      expect(callbackResponse.status).toBe(307);
      expect(callbackResponse.headers.get('location')).toContain('/dashboard');

      // Verify Supabase interactions
      expect(mockSupabaseClient.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: {
          scopes: 'email profile https://www.googleapis.com/auth/gmail.readonly',
          redirectTo: 'http://localhost:3000/api/auth/google/callback',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
            state: 'http%3A%2F%2Flocalhost%3A3000%2Fdashboard',
          },
        },
      });

      expect(mockSupabaseClient.auth.exchangeCodeForSession).toHaveBeenCalledWith('auth-code');
      
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('users');
    });

    it('should handle OAuth flow with errors', async () => {
      const { checkRateLimit } = await import('@/lib/security');
      
      // Set up mocks for error flow
      (checkRateLimit as any).mockReturnValue({ 
        allowed: true, 
        remaining: 4, 
        resetTime: Date.now() + 60000 
      });
      
      mockSupabaseClient.auth.signInWithOAuth.mockResolvedValue({
        data: null,
        error: { message: 'OAuth failed' },
      });

      // Attempt to initiate OAuth flow
      const { POST: loginPost } = await import('../../app/api/auth/google/login/route');
      
      const loginRequest = new NextRequest('http://localhost:3000/api/auth/google/login', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' },
      });

      const loginResponse = await loginPost(loginRequest);
      const loginData = await loginResponse.json();

      expect(loginResponse.status).toBe(500);
      expect(loginData.error).toBe('Failed to initiate OAuth flow');
    });

    it('should handle rate limiting across the flow', async () => {
      const { checkRateLimit } = await import('@/lib/security');
      
      // Set up mocks for rate limiting
      (checkRateLimit as any).mockReturnValue({ 
        allowed: false, 
        remaining: 0, 
        resetTime: Date.now() + 60000 
      });

      const { POST: loginPost } = await import('../../app/api/auth/google/login/route');
      
      const loginRequest = new NextRequest('http://localhost:3000/api/auth/google/login', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' },
      });

      const loginResponse = await loginPost(loginRequest);
      const loginData = await loginResponse.json();

      expect(loginResponse.status).toBe(429);
      expect(loginData.error).toBe('Too many requests. Please try again later.');
      expect(loginResponse.headers.get('X-RateLimit-Remaining')).toBe('0');
    });
  });
});
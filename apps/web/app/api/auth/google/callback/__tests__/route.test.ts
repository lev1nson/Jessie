import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../route';

// Mock dependencies
vi.mock('@supabase/ssr', () => ({
  createRouteHandlerClient: vi.fn(() => ({
    auth: {
      exchangeCodeForSession: vi.fn(),
    },
    from: vi.fn(() => ({
      upsert: vi.fn(() => ({
        error: null,
      })),
    })),
  })),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({})),
}));

vi.mock('../../../../lib/security', () => ({
  checkRateLimit: vi.fn(() => ({ allowed: true, remaining: 9, resetTime: Date.now() + 60000 })),
  getClientIP: vi.fn(() => '127.0.0.1'),
  validateRedirectUrl: vi.fn(() => true),
  UserValidationSchema: {
    parse: vi.fn(),
  },
  secureLog: vi.fn(),
}));

beforeEach(() => {
  process.env.NEXTAUTH_URL = 'http://localhost:3000';
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('/api/auth/google/callback', () => {
  describe('GET', () => {
    it('should handle successful OAuth callback', async () => {
      const { createRouteHandlerClient } = await import('@supabase/ssr');
      const mockSupabase = createRouteHandlerClient({} as any);
      
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        email_confirmed_at: new Date().toISOString(),
        user_metadata: {
          full_name: 'Test User',
          avatar_url: 'https://example.com/avatar.jpg',
          sub: 'google-id-123',
        },
      };

      const mockSession = { user: mockUser, access_token: 'token' };

      (mockSupabase.auth.exchangeCodeForSession as any).mockResolvedValue({
        data: { session: mockSession, user: mockUser },
        error: null,
      });

      const request = new NextRequest(
        'http://localhost:3000/api/auth/google/callback?code=auth-code&state=http%3A//localhost%3A3000/dashboard'
      );

      const response = await GET(request);

      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toContain('/dashboard');
    });

    it('should handle OAuth error in callback', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/auth/google/callback?error=access_denied'
      );

      const response = await GET(request);

      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toContain('/auth/login?error=access_denied');
    });

    it('should handle missing authorization code', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/auth/google/callback'
      );

      const response = await GET(request);

      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toContain('/auth/login?error=no_code');
    });

    it('should handle session exchange failure', async () => {
      const { createRouteHandlerClient } = await import('@supabase/ssr');
      const mockSupabase = createRouteHandlerClient({} as any);
      
      (mockSupabase.auth.exchangeCodeForSession as any).mockResolvedValue({
        data: null,
        error: { message: 'Session exchange failed' },
      });

      const request = new NextRequest(
        'http://localhost:3000/api/auth/google/callback?code=invalid-code'
      );

      const response = await GET(request);

      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toContain('/auth/login?error=session_failed');
    });

    it('should handle user data validation failure', async () => {
      const { createRouteHandlerClient } = await import('@supabase/ssr');
      const { UserValidationSchema } = await import('@lib/security');
      
      const mockSupabase = createRouteHandlerClient({} as any);
      
      const mockUser = {
        id: 'user-123',
        email: 'invalid-email',
        user_metadata: {},
      };

      const mockSession = { user: mockUser, access_token: 'token' };

      (mockSupabase.auth.exchangeCodeForSession as any).mockResolvedValue({
        data: { session: mockSession, user: mockUser },
        error: null,
      });

      (UserValidationSchema.parse as any).mockImplementation(() => {
        throw new Error('Validation failed');
      });

      const request = new NextRequest(
        'http://localhost:3000/api/auth/google/callback?code=auth-code'
      );

      const response = await GET(request);

      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toContain('/auth/login?error=invalid_user_data');
    });

    it('should handle rate limiting', async () => {
      const { checkRateLimit } = await import('@lib/security');
      (checkRateLimit as any).mockReturnValue({ 
        allowed: false, 
        remaining: 0, 
        resetTime: Date.now() + 60000 
      });

      const request = new NextRequest(
        'http://localhost:3000/api/auth/google/callback?code=auth-code'
      );

      const response = await GET(request);

      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toContain('/auth/login?error=rate_limit');
    });

    it('should validate redirect state parameter', async () => {
      const { createRouteHandlerClient } = await import('@supabase/ssr');
      const { validateRedirectUrl } = await import('@lib/security');
      
      const mockSupabase = createRouteHandlerClient({} as any);
      
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        email_confirmed_at: new Date().toISOString(),
        user_metadata: {
          full_name: 'Test User',
          sub: 'google-id-123',
        },
      };

      const mockSession = { user: mockUser, access_token: 'token' };

      (mockSupabase.auth.exchangeCodeForSession as any).mockResolvedValue({
        data: { session: mockSession, user: mockUser },
        error: null,
      });

      (validateRedirectUrl as any).mockReturnValue(false);

      const request = new NextRequest(
        'http://localhost:3000/api/auth/google/callback?code=auth-code&state=https%3A//malicious-site.com'
      );

      const response = await GET(request);

      expect(response.status).toBe(302);
      // Should redirect to default dashboard instead of malicious URL
      expect(response.headers.get('location')).toContain('/dashboard');
    });
  });
});
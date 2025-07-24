import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../route';

// Mock dependencies
vi.mock('@supabase/ssr', () => ({
  createRouteHandlerClient: vi.fn(() => ({
    auth: {
      signInWithOAuth: vi.fn(),
    },
  })),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({})),
}));

vi.mock('../../../../lib/security', () => ({
  checkRateLimit: vi.fn(() => ({ allowed: true, remaining: 4, resetTime: Date.now() + 60000 })),
  getClientIP: vi.fn(() => '127.0.0.1'),
  validateRedirectUrl: vi.fn(() => true),
  generateCSRFToken: vi.fn(() => 'mock-csrf-token'),
  secureLog: vi.fn(),
}));

// Mock environment variables
beforeEach(() => {
  process.env.NEXTAUTH_URL = 'http://localhost:3000';
  process.env.GOOGLE_CLIENT_ID = 'test-client-id';
  process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('/api/auth/google/login', () => {
  describe('POST', () => {
    it('should initiate OAuth flow successfully', async () => {
      const { createRouteHandlerClient } = await import('@supabase/ssr');
      const mockSupabase = createRouteHandlerClient({} as any);
      
      (mockSupabase.auth.signInWithOAuth as any).mockResolvedValue({
        data: { url: 'https://accounts.google.com/oauth/authorize?...' },
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/auth/google/login', {
        method: 'POST',
        body: JSON.stringify({ redirectTo: 'http://localhost:3000/dashboard' }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('url');
      expect(data.url).toContain('accounts.google.com');
    });

    it('should handle invalid redirect URL', async () => {
      const { validateRedirectUrl } = await import('@lib/security');
      (validateRedirectUrl as any).mockReturnValue(false);

      const request = new NextRequest('http://localhost:3000/api/auth/google/login', {
        method: 'POST',
        body: JSON.stringify({ redirectTo: 'https://malicious-site.com' }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid redirect URL');
    });

    it('should handle rate limiting', async () => {
      const { checkRateLimit } = await import('@lib/security');
      (checkRateLimit as any).mockReturnValue({ 
        allowed: false, 
        remaining: 0, 
        resetTime: Date.now() + 60000 
      });

      const request = new NextRequest('http://localhost:3000/api/auth/google/login', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toBe('Too many requests. Please try again later.');
    });

    it('should handle OAuth initiation failure', async () => {
      const { createRouteHandlerClient } = await import('@supabase/ssr');
      const mockSupabase = createRouteHandlerClient({} as any);
      
      (mockSupabase.auth.signInWithOAuth as any).mockResolvedValue({
        data: null,
        error: { message: 'OAuth failed' },
      });

      const request = new NextRequest('http://localhost:3000/api/auth/google/login', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to initiate OAuth flow');
    });

    it('should handle invalid JSON body', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/google/login', {
        method: 'POST',
        body: 'invalid json',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });

    it('should validate request schema', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/google/login', {
        method: 'POST',
        body: JSON.stringify({ redirectTo: 'not-a-url' }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request data');
      expect(data.details).toBeDefined();
    });
  });
});
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../route';

// Create mock functions that can be controlled per test
const mockSignInWithOAuth = vi.fn();
const mockCookiesGetAll = vi.fn();
const mockCookiesSet = vi.fn();

// Mock dependencies with proper factory functions
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn((url, key, options) => {
    // Call the cookies methods to ensure they work
    if (options?.cookies) {
      options.cookies.getAll();
      options.cookies.setAll([]);
    }
    return {
      auth: {
        signInWithOAuth: mockSignInWithOAuth,
      },
    };
  }),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    getAll: mockCookiesGetAll,
    set: mockCookiesSet,
  })),
}));

vi.mock('@lib/security', () => ({
  checkRateLimit: vi.fn(() => ({ allowed: true, remaining: 4, resetTime: Date.now() + 60000 })),
  getClientIP: vi.fn(() => '127.0.0.1'),
  validateRedirectUrl: vi.fn(() => true),
  generateCSRFToken: vi.fn(() => 'mock-csrf-token'),
  secureLog: vi.fn(),
}));

// Mock environment variables
beforeEach(async () => {
  vi.stubEnv('NEXTAUTH_URL', 'http://localhost:3000');
  vi.stubEnv('GOOGLE_CLIENT_ID', 'test-client-id');
  vi.stubEnv('GOOGLE_CLIENT_SECRET', 'test-client-secret');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://localhost:54321');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon-key');
  vi.stubEnv('NODE_ENV', 'test');
  
  // Reset all mocks to default values
  vi.clearAllMocks();
  
  // Set up default mock implementations
  mockSignInWithOAuth.mockResolvedValue({
    data: { url: 'https://accounts.google.com/oauth/authorize?...' },
    error: null,
  });
  
  mockCookiesGetAll.mockReturnValue([]);
  mockCookiesSet.mockImplementation(() => {});
  
  // Reset security mocks to default values
  const { checkRateLimit, validateRedirectUrl, getClientIP, secureLog } = await import('@lib/security');
  (checkRateLimit as any).mockReturnValue({ allowed: true, remaining: 4, resetTime: Date.now() + 60000 });
  (validateRedirectUrl as any).mockReturnValue(true);
  (getClientIP as any).mockReturnValue('127.0.0.1');
  (secureLog as any).mockImplementation(() => {});
});

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});

describe('/api/auth/google/login', () => {
  describe('POST', () => {
    it('should initiate OAuth flow successfully', async () => {
      // Mock successful OAuth response
      mockSignInWithOAuth.mockResolvedValue({
        data: { url: 'https://accounts.google.com/oauth/authorize?client_id=test&redirect_uri=callback' },
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
      expect(mockSignInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: {
          scopes: 'email profile https://www.googleapis.com/auth/gmail.readonly',
          redirectTo: 'http://localhost:3000/api/auth/google/callback',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
            state: encodeURIComponent('http://localhost:3000/dashboard'),
          },
        },
      });
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
      // Mock OAuth failure
      mockSignInWithOAuth.mockResolvedValue({
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
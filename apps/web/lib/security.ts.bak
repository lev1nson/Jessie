import { z } from 'zod';
import { NextRequest } from 'next/server';
import crypto from 'crypto';

// Rate limiting storage (in production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Enhanced validation schemas
export const OAuthStateSchema = z.object({
  state: z.string().min(32), // CSRF protection
  codeVerifier: z.string().min(43).max(128).optional(), // PKCE
  redirectUri: z.string().url(),
  timestamp: z.number(),
});

export const AuthTokenSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string().optional(),
  expires_in: z.number().positive(),
  token_type: z.literal('Bearer'),
  scope: z.string(),
});

export const UserValidationSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1).max(255),
  picture: z.string().url().optional(),
  email_verified: z.boolean(),
});

// CSRF token generation and validation
export function generateCSRFToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function validateCSRFToken(token: string, sessionToken: string): boolean {
  return crypto.timingSafeEqual(
    Buffer.from(token, 'hex'),
    Buffer.from(sessionToken, 'hex')
  );
}

// Secure redirect URL validation
export function validateRedirectUrl(url: string, allowedDomains: string[]): boolean {
  try {
    const parsedUrl = new URL(url);
    
    // Only allow HTTPS in production
    if (process.env.NODE_ENV === 'production' && parsedUrl.protocol !== 'https:') {
      return false;
    }
    
    // Check against allowed domains
    return allowedDomains.some(domain => 
      parsedUrl.hostname === domain || 
      parsedUrl.hostname.endsWith(`.${domain}`)
    );
  } catch {
    return false;
  }
}

// Rate limiting
export function checkRateLimit(
  identifier: string, 
  windowMs: number = 60000, // 1 minute
  maxRequests: number = 10
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const record = rateLimitStore.get(identifier);
  
  if (!record || now > record.resetTime) {
    // New window or reset time passed
    const resetTime = now + windowMs;
    rateLimitStore.set(identifier, { count: 1, resetTime });
    return { allowed: true, remaining: maxRequests - 1, resetTime };
  }
  
  if (record.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetTime: record.resetTime };
  }
  
  record.count++;
  return { 
    allowed: true, 
    remaining: maxRequests - record.count, 
    resetTime: record.resetTime 
  };
}

// Extract client IP address
export function getClientIP(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const connIP = request.headers.get('x-forwarded-for')?.split(',')[0];
  
  return forwardedFor?.split(',')[0] || realIP || connIP || 'unknown';
}

// Secure logging (avoid logging sensitive data)
export function secureLog(level: 'info' | 'warn' | 'error', message: string, metadata?: Record<string, unknown>) {
  const sanitizedMetadata = metadata ? sanitizeLogData(metadata) : {};
  
  console[level](`[AUTH] ${message}`, {
    timestamp: new Date().toISOString(),
    ...sanitizedMetadata,
  });
}

// Sanitize log data to prevent sensitive information leakage
function sanitizeLogData(data: Record<string, unknown>): Record<string, unknown> {
  const sensitiveKeys = [
    'password', 'token', 'secret', 'key', 'authorization',
    'access_token', 'refresh_token', 'client_secret'
  ];
  
  const sanitized: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(data)) {
    if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'string' && value.length > 100) {
      sanitized[key] = value.substring(0, 97) + '...';
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

// Token refresh logic
export async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string;
  expires_in: number;
  refresh_token?: string;
} | null> {
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      secureLog('error', 'Token refresh failed', { 
        status: response.status,
        statusText: response.statusText 
      });
      return null;
    }

    const data = await response.json();
    return AuthTokenSchema.parse(data);
  } catch (error) {
    secureLog('error', 'Token refresh error', { error: String(error) });
    return null;
  }
}

// Environment validation
export function validateEnvironment(): void {
  // Skip validation in test environment or development with placeholder values
  if (process.env.NODE_ENV === 'test') {
    return;
  }

  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_KEY',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'NEXTAUTH_SECRET',
    'NEXTAUTH_URL',
  ];

  const missing = requiredEnvVars.filter(envVar => {
    const value = process.env[envVar];
    return !value || value.startsWith('your_') || value === 'your_supabase_url_here';
  });
  
  if (missing.length > 0) {
    console.warn(`[AUTH] Missing or placeholder environment variables: ${missing.join(', ')}`);
    console.warn(`[AUTH] Please configure these variables in .env.local for full functionality`);
    
    // Only throw in production
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
  }
}

// Initialize security validation on module load (but don't throw in development)
try {
  validateEnvironment();
} catch (error) {
  if (process.env.NODE_ENV === 'production') {
    throw error;
  }
}
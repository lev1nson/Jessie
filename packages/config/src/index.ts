import { z } from 'zod';

// Environment variable schema
const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_KEY: z.string().min(1).optional(),
  GOOGLE_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
  OPENAI_API_KEY: z.string().min(1).optional(),
  NEXTAUTH_SECRET: z.string().min(1).optional(),
  NEXTAUTH_URL: z.string().url().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

// Parse and validate environment variables
export const env = envSchema.parse(process.env);

// App configuration
export const config = {
  app: {
    name: 'Jessie Email Assistant',
    version: '1.0.0',
    description: 'AI-powered email assistant for analyzing email conversations',
  },
  database: {
    maxConnections: 10,
    timeout: 30000,
  },
  ai: {
    embeddingModel: 'text-embedding-ada-002',
    chatModel: 'gpt-4-turbo-preview',
    maxTokens: 4000,
    temperature: 0.7,
  },
  email: {
    batchSize: 50,
    maxAttachmentSize: 10 * 1024 * 1024, // 10MB
    supportedFormats: ['txt', 'pdf', 'doc', 'docx'],
  },
  security: {
    sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
    maxLoginAttempts: 5,
    lockoutDuration: 15 * 60 * 1000, // 15 minutes
  },
} as const;
import { NextResponse } from 'next/server';

export async function GET() {
  const required = [
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET', 
    'OPENAI_API_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'CRON_SECRET',
    'NEXTAUTH_SECRET',
    'NEXTAUTH_URL'
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  return NextResponse.json({ 
    status: missing.length === 0 ? 'ok' : 'missing', 
    missing,
    total: required.length,
    present: required.length - missing.length
  });
}
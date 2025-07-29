import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { SimpleGmailService } from '@/lib/gmail/simpleService';
import { SimpleEmailRepository } from '@/lib/repositories/simpleEmailRepository';

interface UserWithTokens {
  id: string;
  email: string;
  google_access_token: string;
  google_refresh_token: string;
  google_token_expiry?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Create Supabase client with SSR for auth
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body for optional fromDate parameter
    const body = await request.json().catch(() => ({}));
    const fromDate = body.fromDate ? new Date(body.fromDate) : undefined;

    console.log(`Manual sync triggered by user: ${user.email}${fromDate ? ` from date: ${fromDate.toISOString()}` : ''}`);

    // Get user with Google tokens using service client
    const serviceSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
    
    const { data: userWithTokens, error: userError } = await serviceSupabase
      .from('users')
      .select('id, email, google_access_token, google_refresh_token, google_token_expiry')
      .eq('id', user.id)
      .single();

    if (userError || !userWithTokens) {
      return NextResponse.json(
        { error: 'User tokens not found. Please re-authenticate with Google.' },
        { status: 400 }
      );
    }

    console.log(`Processing emails for user: ${userWithTokens.email}`);

    // Process emails for this user
    const emailRepository = new SimpleEmailRepository();
    const emailsProcessed = await processUserEmails(userWithTokens as UserWithTokens, emailRepository, fromDate);

    return NextResponse.json({ 
      success: true, 
      message: `Sync completed. Processed ${emailsProcessed} emails.`,
      emailsProcessed,
      triggeredAt: new Date().toISOString(),
      fromDate: fromDate?.toISOString()
    });

  } catch (error) {
    console.error('Error triggering sync:', error);
    return NextResponse.json(
      { error: `Internal server error: ${error}` },
      { status: 500 }
    );
  }
}

/**
 * Processes emails for a single user with optional fromDate override
 */
async function processUserEmails(
  user: UserWithTokens,
  emailRepository: SimpleEmailRepository,
  fromDateOverride?: Date
): Promise<number> {
  const gmailService = new SimpleGmailService();
  
  try {
    // Initialize Gmail service with user tokens
    await gmailService.initialize({
      access_token: user.google_access_token,
      refresh_token: user.google_refresh_token,
      expiry_date: user.google_token_expiry ? new Date(user.google_token_expiry).getTime() : undefined,
    });

    // Determine start date - use override if provided, otherwise last email date or 30 days ago
    let afterDate = fromDateOverride;
    if (!afterDate) {
      afterDate = await emailRepository.getLastEmailDate(user.id);
      if (!afterDate) {
        // If this is first run, take emails from last 30 days
        afterDate = new Date();
        afterDate.setDate(afterDate.getDate() - 30);
      }
    }

    console.log(`Fetching emails for ${user.email} after ${afterDate.toISOString()}`);

    // Fetch new emails from Gmail (simulated)
    const newEmails = await gmailService.fetchNewEmails(afterDate, ['INBOX', 'SENT']);
    
    if (newEmails.length === 0) {
      console.log(`No new emails found for ${user.email}`);
      return 0;
    }

    console.log(`Found ${newEmails.length} emails for ${user.email}`);

    // Filter emails that don't exist in database (deduplication)
    const deduplicatedEmails = await emailRepository.filterNewEmails(newEmails);
    
    if (deduplicatedEmails.length === 0) {
      console.log(`All emails for ${user.email} already exist in database`);
      return 0;
    }

    console.log(`Processing ${deduplicatedEmails.length} new emails for ${user.email}`);

    // Save processed emails to database
    const savedEmails = await emailRepository.saveFilteredEmailsBatch(user.id, deduplicatedEmails);
    
    console.log(`Successfully saved ${savedEmails.length} emails for ${user.email}`);
    
    return savedEmails.length;
  } catch (error) {
    console.error(`Error processing emails for ${user.email}:`, error);
    throw error;
  }
}
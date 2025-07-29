import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SimpleGmailService } from '@/lib/gmail/simpleService';
import { SimpleEmailRepository } from '@/lib/repositories/simpleEmailRepository';

export async function POST(request: NextRequest) {
  try {
    console.log('Debug sync test started');

    // Get service client
    const serviceSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    // Get first user for testing
    const { data: users, error: usersError } = await serviceSupabase
      .from('users')
      .select('id, email')
      .limit(1);

    if (usersError || !users || users.length === 0) {
      return NextResponse.json(
        { error: 'No users found for testing' },
        { status: 400 }
      );
    }

    const testUser = users[0];
    console.log(`Testing sync for user: ${testUser.email}`);

    // Initialize services
    const gmailService = new SimpleGmailService();
    const emailRepository = new SimpleEmailRepository();

    // Simulate Gmail initialization
    await gmailService.initialize({
      access_token: 'test_token',
      refresh_token: 'test_refresh_token'
    });

    // Get date 30 days ago
    const afterDate = new Date();
    afterDate.setDate(afterDate.getDate() - 30);

    console.log(`Fetching emails after ${afterDate.toISOString()}`);

    // Fetch simulated emails
    const newEmails = await gmailService.fetchNewEmails(afterDate, ['INBOX']);
    console.log(`Found ${newEmails.length} simulated emails`);

    // Save to database
    const savedEmails = await emailRepository.saveFilteredEmailsBatch(testUser.id, newEmails);
    console.log(`Saved ${savedEmails.length} emails to database`);

    return NextResponse.json({
      success: true,
      message: `Sync test completed for ${testUser.email}`,
      user: testUser,
      emailsProcessed: savedEmails.length,
      emails: savedEmails.map(email => ({
        id: email.google_message_id,
        subject: email.subject,
        from: email.from_email,
        received_at: email.received_at
      })),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in sync test:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    return NextResponse.json(
      { 
        error: `Internal server error: ${errorMessage}`,
        stack: errorStack,
        details: error
      },
      { status: 500 }
    );
  }
}
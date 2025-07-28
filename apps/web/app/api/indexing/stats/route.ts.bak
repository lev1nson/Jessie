import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    // Create Supabase client with SSR
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
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

    // Query real indexing stats from the emails table
    const { data: emailStats, error: statsError } = await supabase
      .from('emails')
      .select('processed_at, vectorized_at, is_filtered, filter_reason')
      .eq('user_id', user.id);

    if (statsError) {
      console.error('Error fetching email stats:', statsError);
      return NextResponse.json(
        { error: 'Failed to fetch email statistics' },
        { status: 500 }
      );
    }

    // Get last sync time from user profile
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('last_email_sync')
      .eq('id', user.id)
      .single();

    if (userError) {
      console.error('Error fetching user data:', userError);
    }

    // Calculate statistics
    const totalEmails = emailStats?.length || 0;
    const processedEmails = emailStats?.filter(email => email.processed_at !== null).length || 0;
    const indexedEmails = emailStats?.filter(email => email.vectorized_at !== null).length || 0;
    const errorCount = emailStats?.filter(email => 
      email.is_filtered && email.filter_reason === 'processing_error'
    ).length || 0;

    const stats = {
      totalEmails,
      processedEmails,
      indexedEmails,
      lastSyncAt: userData?.last_email_sync || null,
      isProcessing: false, // This would need to be tracked in a separate sync status table
      errorCount
    };

    return NextResponse.json(stats);

  } catch (error) {
    console.error('Error fetching indexing stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
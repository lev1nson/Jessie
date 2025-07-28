import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function DELETE(request: NextRequest) {
  try {
    // Create Supabase client with SSR
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

    // Parse request body for confirmation
    const body = await request.json().catch(() => ({}));
    if (body.confirmText !== 'DELETE ALL EMAILS') {
      return NextResponse.json(
        { error: 'Invalid confirmation text' },
        { status: 400 }
      );
    }

    console.log(`Database cleanup requested by user: ${user.email}`);

    // Create service client for data operations
    const { createServiceSupabase } = await import('@jessie/lib');
    const serviceSupabase = createServiceSupabase();

    // Get count before deletion for logging
    const { count: beforeCount } = await serviceSupabase
      .from('emails')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    // Delete all emails for the user
    const { error: deleteError } = await serviceSupabase
      .from('emails')
      .delete()
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('Error deleting emails:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete emails' },
        { status: 500 }
      );
    }

    console.log(`Successfully deleted ${beforeCount || 0} emails for user: ${user.email}`);

    return NextResponse.json({ 
      success: true, 
      message: `Successfully deleted ${beforeCount || 0} emails`,
      deletedCount: beforeCount || 0,
      deletedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error during cleanup:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
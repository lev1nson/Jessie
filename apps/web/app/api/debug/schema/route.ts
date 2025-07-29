import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    // Try to get schema info by testing a query
    const { data: emailTest, error: emailError } = await supabase
      .from('emails')
      .select('*')
      .limit(1);

    const results = {
      emails: {
        accessible: !emailError,
        error: emailError?.message || null,
        sampleData: emailTest || null
      }
    };

    // Test other common queries
    try {
      const { data: usersTest, error: usersError } = await supabase
        .from('users')
        .select('*')
        .limit(1);

      results.users = {
        accessible: !usersError,
        error: usersError?.message || null,
        sampleData: usersTest || null
      };
    } catch (e) {
      results.users = {
        accessible: false,
        error: `Error: ${e}`,
        sampleData: null
      };
    }

    return NextResponse.json({
      success: true,
      schema: results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error checking schema:', error);
    return NextResponse.json(
      { 
        error: `Internal server error: ${error}`,
        details: error
      },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    // Create Supabase client with service key
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    const results = {
      connection: 'unknown',
      users: 0,
      emails: 0,
      vectorEmbeddings: 0,
      tables: [],
      errors: [] as string[]
    };

    try {
      // Test connection by trying to access users table
      const { data: testData, error: testError } = await supabase
        .from('users')
        .select('id')
        .limit(1);

      if (testError) {
        results.errors.push(`Connection test error: ${testError.message}`);
        results.connection = 'failed';
      } else {
        results.connection = 'success';
        results.tables = ['users', 'emails', 'vector_embeddings']; // Assume these exist
      }

      // Check users table
      if (results.tables.includes('users')) {
        const { count: usersCount, error: usersError } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true });
        
        if (usersError) {
          results.errors.push(`Users count error: ${usersError.message}`);
        } else {
          results.users = usersCount || 0;
        }
      }

      // Check emails table
      if (results.tables.includes('emails')) {
        const { count: emailsCount, error: emailsError } = await supabase
          .from('emails')
          .select('*', { count: 'exact', head: true });
        
        if (emailsError) {
          results.errors.push(`Emails count error: ${emailsError.message}`);
        } else {
          results.emails = emailsCount || 0;
        }
      }

      // Check vector_embeddings table
      if (results.tables.includes('vector_embeddings')) {
        const { count: vectorCount, error: vectorError } = await supabase
          .from('vector_embeddings')
          .select('*', { count: 'exact', head: true });
        
        if (vectorError) {
          results.errors.push(`Vector embeddings count error: ${vectorError.message}`);
        } else {
          results.vectorEmbeddings = vectorCount || 0;
        }
      }

    } catch (dbError) {
      results.connection = 'failed';
      results.errors.push(`Database connection error: ${dbError}`);
    }

    return NextResponse.json({
      success: results.connection === 'success',
      database: results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error checking database:', error);
    return NextResponse.json(
      { error: `Internal server error: ${error}` },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { SimpleEmailRepository } from '@/lib/repositories/simpleEmailRepository';

export async function GET(request: NextRequest) {
  try {
    const emailRepository = new SimpleEmailRepository();
    
    // For testing, use the actual user ID from database
    const userId = 'a6222246-0b53-4be2-a9e1-490d1ab00459'; // From database query result
    
    const emails = await emailRepository.getAllEmails(userId, 10);

    return NextResponse.json({
      success: true,
      emails,
      count: emails.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error getting emails:', error);
    return NextResponse.json(
      { error: `Internal server error: ${error}` },
      { status: 500 }
    );
  }
}
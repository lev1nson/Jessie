import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('Sync endpoint called');
    
    // Simple response for testing
    return NextResponse.json({ 
      success: true, 
      message: 'Sync endpoint working - ready for RAG testing',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in sync endpoint:', error);
    return NextResponse.json(
      { error: `Internal server error: ${error}` },
      { status: 500 }
    );
  }
}
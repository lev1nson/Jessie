import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { EmbeddingService } from '@/lib/llm/embeddingService';
import { VectorRepository } from '@/lib/repositories/vectorRepository';
import { checkRateLimit, getClientIP } from '@/lib/security';

const sendMessageSchema = z.object({
  chatId: z.string().uuid(),
  content: z.string().min(1).max(4000),
});

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientIP = getClientIP(request);
    const rateLimitResult = checkRateLimit(clientIP, 60 * 1000, 20);

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const { chatId, content } = sendMessageSchema.parse(body);

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

    // Verify chat belongs to user
    const { data: chat, error: chatError } = await supabase
      .from('chats')
      .select('id, user_id')
      .eq('id', chatId)
      .eq('user_id', user.id)
      .single();

    if (chatError || !chat) {
      return NextResponse.json(
        { error: 'Chat not found' },
        { status: 404 }
      );
    }

    // Save user message
    const { data: userMessage, error: messageError } = await supabase
      .from('messages')
      .insert({
        chat_id: chatId,
        role: 'user',
        content: content,
      })
      .select()
      .single();

    if (messageError) {
      console.error('Error saving user message:', messageError);
      return NextResponse.json(
        { error: 'Failed to save message' },
        { status: 500 }
      );
    }

    // Generate embedding for user query
    const embeddingService = new EmbeddingService();
    let queryEmbedding: number[];
    
    try {
      const embeddingResponse = await embeddingService.generateEmbedding({
        text: content,
      });
      queryEmbedding = embeddingResponse.embedding;
    } catch (embeddingError) {
      console.error('Error generating embedding:', embeddingError);
      return NextResponse.json(
        { error: 'Failed to process query' },
        { status: 500 }
      );
    }

    // Perform vector search
    const vectorRepository = new VectorRepository();
    let searchResults: any[] = [];
    let assistantResponse = "I'm sorry, I couldn't find any relevant information in your emails.";

    try {
      searchResults = await vectorRepository.searchSimilarVectors(queryEmbedding, {
        limit: 5,
        threshold: 0.7,
        userId: user.id,
      });

      if (searchResults.length > 0) {
        // Format the response based on search results
        const relevantTexts = searchResults
          .slice(0, 3) // Use top 3 results
          .map((result, index) => `${index + 1}. ${result.body_text?.substring(0, 300)}...`)
          .join('\n\n');

        assistantResponse = `Based on your emails, here's what I found:\n\n${relevantTexts}`;
        
        if (searchResults.length > 3) {
          assistantResponse += `\n\nI found ${searchResults.length} relevant emails total.`;
        }
      }
    } catch (searchError) {
      console.error('Error performing vector search:', searchError);
      // Continue with default response if search fails
    }

    // Save assistant message
    const sourceEmailIds = searchResults.map(result => result.id).filter(Boolean);
    const { data: assistantMessage, error: assistantMessageError } = await supabase
      .from('messages')
      .insert({
        chat_id: chatId,
        role: 'assistant',
        content: assistantResponse,
        source_email_ids: sourceEmailIds.length > 0 ? sourceEmailIds : null,
      })
      .select()
      .single();

    if (assistantMessageError) {
      console.error('Error saving assistant message:', assistantMessageError);
      return NextResponse.json(
        { error: 'Failed to save assistant response' },
        { status: 500 }
      );
    }

    // Update chat's updated_at timestamp
    await supabase
      .from('chats')
      .update({ 
        updated_at: new Date().toISOString(), // Update timestamp
      })
      .eq('id', chatId);

    return NextResponse.json({
      message: {
        ...userMessage,
        createdAt: userMessage.created_at,
      },
      assistantMessage: {
        ...assistantMessage,
        createdAt: assistantMessage.created_at,
        sourceEmailIds: assistantMessage.source_email_ids,
      },
    });

  } catch (error) {
    console.error('Error in chat messages API:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
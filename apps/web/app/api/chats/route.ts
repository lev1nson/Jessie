import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { checkRateLimit, getClientIP } from '@/lib/security';

const createChatSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  firstMessage: z.string().min(1).max(4000).optional(),
});

export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const clientIP = getClientIP(request);
    const rateLimitResult = checkRateLimit(clientIP, 60 * 1000, 100);

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

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

    // Get user's chats
    const { data: chats, error: chatsError } = await supabase
      .from('chats')
      .select(`
        id,
        title,
        created_at,
        messages(content)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (chatsError) {
      console.error('Error fetching chats:', chatsError);
      return NextResponse.json(
        { error: 'Failed to fetch chats' },
        { status: 500 }
      );
    }

    // Transform data to match frontend expectations
    const transformedChats = chats?.map(chat => ({
      id: chat.id,
      title: chat.title,
      createdAt: chat.created_at,
      updatedAt: chat.created_at, // Use created_at as fallback
      lastMessage: chat.messages?.[0]?.content || '',
      isActive: true,
    })) || [];

    return NextResponse.json({ chats: transformedChats });

  } catch (error) {
    console.error('Error in chats API GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientIP = getClientIP(request);
    const rateLimitResult = checkRateLimit(clientIP, 60 * 1000, 10);

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const { title, firstMessage } = createChatSchema.parse(body);

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

    // Create new chat
    const chatTitle = title || firstMessage?.substring(0, 50) || 'New Chat';
    const { data: chat, error: chatError } = await supabase
      .from('chats')
      .insert({
        user_id: user.id,
        title: chatTitle,
      })
      .select()
      .single();

    if (chatError) {
      console.error('Error creating chat:', chatError);
      return NextResponse.json(
        { error: 'Failed to create chat' },
        { status: 500 }
      );
    }

    // Transform response to match frontend expectations
    const transformedChat = {
      id: chat.id,
      title: chat.title,
      createdAt: chat.created_at,
      updatedAt: chat.created_at,
      lastMessage: '',
      isActive: true,
    };

    return NextResponse.json({ chat: transformedChat });

  } catch (error) {
    console.error('Error in chats API POST:', error);
    
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
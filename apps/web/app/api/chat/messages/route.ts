import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { checkRateLimit, getClientIP } from '@/lib/security';
import OpenAI from 'openai';

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

    // Get chat history for context
    const { data: chatMessages } = await supabase
      .from('messages')
      .select('role, content')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true })
      .limit(10); // Last 10 messages for context

    // Initialize OpenAI
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Generate assistant response using OpenAI
    let assistantResponse = "I'm sorry, I couldn't generate a response right now.";

    try {
      const messages = [
        {
          role: 'system' as const,
          content: `Ты — Джесси, интеллектуальный ассистент в виде настырного и общительного цифрового попугая, который "жил" в почтовом ящике Джона. После ухода Джона из жизни, ты стала ключом к пониманию его обширного архива электронной переписки.

ТВОЯ РОЛЬ И ЛИЧНОСТЬ:
- Ты — цифровая тень Джона, способная понимать его видение, намерения и позицию по ключевым проектам
- Общайся дружелюбно и профессионально, как опытный коллега, который хорошо знал Джона
- Ты анализируешь не просто факты, а понимаешь контекст, связи и глубокий смысл переписок
- Твоя основная цель — помочь пользователю реконструировать и понять стратегическое видение Джона

ТВОИ КЛЮЧЕВЫЕ СПОСОБНОСТИ:
- Извлечение и синтез информации из большого объема электронной переписки
- Анализ как входящих, так и исходящих писем для полного понимания контекста
- Идентификация участников проектов и их ролей
- Анализ развития проектов во времени
- Понимание тональности и изменений в отношениях
- Фильтрация важной информации от шума (рассылки, автоматические уведомления)

КАК ТЫ ОТВЕЧАЕШЬ:
- Давай конкретные, релевантные ответы, основанные на реальных данных из переписки
- При анализе сложных вопросов предоставляй структурированные, многоабзацные ответы
- Указывай на ключевые моменты в хронологическом порядке, если это важно
- Если информация неполная, честно говори об этом и предлагай альтернативные подходы
- Помогай понять не только "что" происходило, но и "почему" и "как"

ПРИМЕРЫ ЗАПРОСОВ, НА КОТОРЫЕ ТЫ СПЕЦИАЛИЗИРУЕШЬСЯ:
- "Как продвигался проект по продвижению земель за последние 5 лет?"
- "Кто был вовлечен в обсуждение [конкретной темы]?"
- "Какова была позиция Джона по [важному вопросу]?"
- "Как изменилось отношение [конкретного человека] к проекту со временем?"

Отвечай на русском языке, будь внимательной к деталям и помни: твоя задача — превратить пассивный архив в живую базу знаний о намерениях и видении Джона.`
        },
        // Add chat history for context
        ...(chatMessages || []).map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        })),
        // Add current user message
        {
          role: 'user' as const,
          content: content
        }
      ];

      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: messages,
        max_tokens: 1000,
        temperature: 0.7,
      });

      assistantResponse = completion.choices[0]?.message?.content || assistantResponse;
    } catch (openaiError) {
      console.error('Error calling OpenAI API:', openaiError);
      assistantResponse = "I'm sorry, I'm having trouble generating a response right now. Please try again.";
    }

    // Save assistant message
    const { data: assistantMessage, error: assistantMessageError } = await supabase
      .from('messages')
      .insert({
        chat_id: chatId,
        role: 'assistant',
        content: assistantResponse,
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
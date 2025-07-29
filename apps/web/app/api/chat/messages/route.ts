import { NextRequest, NextResponse } from 'next/server';
import { SimpleEmailRepository } from '@/lib/repositories/simpleEmailRepository';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required and must be a string' },
        { status: 400 }
      );
    }

    console.log('Received chat message:', message);

    // Get real emails from database
    const emailRepository = new SimpleEmailRepository();
    const userId = 'a6222246-0b53-4be2-a9e1-490d1ab00459'; // Fixed for testing
    const emails = await emailRepository.getAllEmails(userId, 10);

    // Simple keyword search in emails
    const relevantEmails = emails.filter(email => 
      email.subject?.toLowerCase().includes(message.toLowerCase()) ||
      email.body_text?.toLowerCase().includes(message.toLowerCase()) ||
      email.sender?.toLowerCase().includes(message.toLowerCase())
    );

    let responseContent = '';
    
    if (relevantEmails.length > 0) {
      responseContent = `🔍 Найдено ${relevantEmails.length} релевантных писем для запроса: "${message}"\n\n`;
      
      relevantEmails.slice(0, 3).forEach((email, index) => {
        responseContent += `📧 **${index + 1}. ${email.subject}**\n`;
        responseContent += `👤 От: ${email.sender}\n`;
        responseContent += `📅 Дата: ${new Date(email.date_sent).toLocaleDateString('ru-RU')}\n`;
        responseContent += `📝 Содержание: ${email.body_text?.substring(0, 200)}...\n\n`;
      });
      
      responseContent += `💡 **Резюме по найденным письмам:**\n`;
      responseContent += `Всего обработано писем: ${emails.length}\n`;
      responseContent += `Релевантных для запроса: ${relevantEmails.length}\n`;
      responseContent += `Поисковый запрос: "${message}"`;
    } else {
      responseContent = `🔍 По вашему запросу "${message}" не найдено релевантных писем.\n\n`;
      responseContent += `📊 **Статистика базы данных:**\n`;
      responseContent += `Всего писем в базе: ${emails.length}\n\n`;
      
      if (emails.length > 0) {
        responseContent += `📧 **Последние письма в базе:**\n`;
        emails.slice(0, 3).forEach((email, index) => {
          responseContent += `${index + 1}. ${email.subject} (от ${email.sender})\n`;
        });
        responseContent += `\n💡 Попробуйте поискать по темам: проект, встреча, бюджет`;
      } else {
        responseContent += `❌ База данных писем пуста. Выполните синхронизацию в настройках системы.`;
      }
    }

    const response: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'assistant',
      content: responseContent,
      timestamp: new Date().toISOString()
    };

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 500));

    return NextResponse.json({
      success: true,
      message: response,
      debug: {
        totalEmails: emails.length,
        relevantEmails: relevantEmails.length,
        searchQuery: message,
        processingTime: '0.5s',
        userId: userId
      }
    });

  } catch (error) {
    console.error('Error in chat messages:', error);
    return NextResponse.json(
      { error: `Internal server error: ${error}` },
      { status: 500 }
    );
  }
}
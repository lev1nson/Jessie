import { NextRequest, NextResponse } from 'next/server';
import { createServiceSupabase } from '@jessie/lib';
import { GmailService } from '@lib/gmail/service';
import { EmailRepository } from '@lib/repositories/emailRepository';
import { FilterConfigRepository } from '@lib/repositories/filterConfigRepository';
import { EmailFilter } from '@lib/filters/emailFilter';
import { HtmlParser } from '@lib/parsers/htmlParser';
import { AttachmentProcessor } from '@lib/parsers/attachmentProcessor';

// Интерфейс для пользователя с токенами
interface UserWithTokens {
  id: string;
  email: string;
  google_access_token: string;
  google_refresh_token: string;
  google_token_expiry?: string;
}

export async function GET(request: NextRequest) {
  // Проверяем авторизацию cron job
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('Starting email sync cron job...');
  
  const supabase = createServiceSupabase();
  const emailRepository = new EmailRepository();
  
  let processedUsers = 0;
  const totalEmailsProcessed = 0;
  const errors: string[] = [];

  try {
    // Получаем всех пользователей с Google токенами
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, google_access_token, google_refresh_token, google_token_expiry')
      .not('google_access_token', 'is', null)
      .not('google_refresh_token', 'is', null);

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      );
    }

    if (!users || users.length === 0) {
      console.log('No users with Google tokens found');
      return NextResponse.json({
        message: 'No users to process',
        processedUsers: 0,
        totalEmailsProcessed: 0,
      });
    }

    console.log(`Found ${users.length} users to process`);

    // Обрабатываем каждого пользователя
    for (const user of users as UserWithTokens[]) {
      try {
        await processUserEmails(user, emailRepository);
        processedUsers++;
        console.log(`Successfully processed user ${user.email}`);
      } catch (error) {
        const errorMessage = `Failed to process user ${user.email}: ${error}`;
        console.error(errorMessage);
        errors.push(errorMessage);
      }
    }

    const result = {
      message: 'Email sync completed',
      processedUsers,
      totalEmailsProcessed,
      errors: errors.length > 0 ? errors : undefined,
    };

    console.log('Email sync cron job completed:', result);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Email sync cron job failed:', error);
    return NextResponse.json(
      { error: 'Email sync failed', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * Обрабатывает письма для одного пользователя
 */
async function processUserEmails(
  user: UserWithTokens,
  emailRepository: EmailRepository
): Promise<number> {
  const gmailService = new GmailService();
  const filterConfigRepository = new FilterConfigRepository();
  const emailFilter = new EmailFilter();
  const htmlParser = new HtmlParser();
  const attachmentProcessor = new AttachmentProcessor();
  
  try {
    // Инициализируем Gmail сервис с токенами пользователя
    await gmailService.initialize({
      access_token: user.google_access_token,
      refresh_token: user.google_refresh_token,
      expiry_date: user.google_token_expiry ? new Date(user.google_token_expiry).getTime() : undefined,
    });

    // Определяем дату последнего письма или используем дату 30 дней назад
    let afterDate = await emailRepository.getLastEmailDate(user.id);
    if (!afterDate) {
      // Если это первый запуск, берем письма за последние 30 дней
      afterDate = new Date();
      afterDate.setDate(afterDate.getDate() - 30);
    }

    console.log(`Fetching emails for ${user.email} after ${afterDate.toISOString()}`);

    // Получаем новые письма из Gmail
    const newEmails = await gmailService.fetchNewEmails(afterDate, ['INBOX', 'SENT']);
    
    if (newEmails.length === 0) {
      console.log(`No new emails found for ${user.email}`);
      return 0;
    }

    console.log(`Found ${newEmails.length} emails for ${user.email}`);

    // Фильтруем письма, которых еще нет в базе (дедупликация)
    const deduplicatedEmails = await emailRepository.filterNewEmails(newEmails);
    
    if (deduplicatedEmails.length === 0) {
      console.log(`All emails for ${user.email} already exist in database`);
      return 0;
    }

    console.log(`Processing ${deduplicatedEmails.length} new emails for ${user.email}`);

    // Получаем пользовательские настройки фильтрации
    const userFilterConfigs = await filterConfigRepository.getUserFilterConfigs(user.id);

    // Применяем фильтрацию контента к письмам
    const filteredEmails = await emailFilter.filterEmails(deduplicatedEmails, userFilterConfigs);

    // Извлекаем и очищаем текстовое содержимое
    const processedEmails = await Promise.all(
      filteredEmails.map(async (email) => {
        try {
          // Обрабатываем HTML содержимое
          if (email.body_html && email.body_html.trim() !== '') {
            const parsedContent = htmlParser.parseHtmlEmail(email.body_html);
            // Обновляем текстовое содержимое с очищенной версией
            email.body_text = parsedContent.plainText || email.body_text;
          } else if (email.body_text) {
            // Очищаем простой текст
            email.body_text = htmlParser.cleanPlainText(email.body_text);
          }

          // Обрабатываем вложения, если есть
          if (email.has_attachments && email.attachments && email.attachments.length > 0) {
            const supportedAttachments = gmailService.getSupportedAttachments(email.attachments);
            
            if (supportedAttachments.length > 0) {
              try {
                // Получаем содержимое вложений
                const attachmentData = await gmailService.fetchAllAttachments(
                  email.google_message_id, 
                  supportedAttachments
                );

                // Обрабатываем вложения
                const validAttachments = attachmentData
                  .filter(data => data.buffer !== null)
                  .map(data => ({ buffer: data.buffer!, info: data.info }));

                if (validAttachments.length > 0) {
                  const processingResult = await attachmentProcessor.processAttachments(validAttachments);
                  
                  // Добавляем содержимое вложений к тексту письма
                  if (processingResult.processed.length > 0) {
                    const attachmentContent = processingResult.processed
                      .map(attachment => `\n\n--- ATTACHMENT: ${attachment.filename} ---\n${attachment.content}\n--- END ATTACHMENT ---`)
                      .join('');
                    
                    email.body_text += attachmentContent;
                  }

                  console.log(`Processed ${processingResult.processed.length} attachments for email ${email.google_message_id}`);
                }
              } catch (attachmentError) {
                console.error(`Error processing attachments for email ${email.google_message_id}:`, attachmentError);
                // Продолжаем обработку письма без вложений
              }
            }
          }

          return email;
        } catch (processingError) {
          console.error(`Error processing email content ${email.google_message_id}:`, processingError);
          return email; // Возвращаем письмо как есть
        }
      })
    );

    // Получаем статистику фильтрации
    const filterStats = emailFilter.getFilteringStats(processedEmails);
    console.log(`Filter stats for ${user.email}:`, filterStats);

    // Сохраняем обработанные письма в базу данных
    const savedEmails = await emailRepository.saveFilteredEmailsBatch(user.id, processedEmails);
    
    console.log(`Successfully saved ${savedEmails.length} emails for ${user.email} (${filterStats.filtered} filtered out)`);
    
    return savedEmails.length;
  } catch (error) {
    // Пытаемся обновить токены если произошла ошибка аутентификации
    if (error instanceof Error && error.message.includes('invalid_grant')) {
      console.log(`Attempting to refresh tokens for ${user.email}`);
      
      try {
        const newCredentials = await gmailService.refreshCredentials();
        
        // Обновляем токены в базе данных
        const supabase = createServiceSupabase();
        await supabase
          .from('users')
          .update({
            google_access_token: newCredentials.access_token,
            google_refresh_token: newCredentials.refresh_token,
            google_token_expiry: newCredentials.expiry_date ? new Date(newCredentials.expiry_date).toISOString() : null,
          })
          .eq('id', user.id);

        console.log(`Successfully refreshed tokens for ${user.email}`);
        
        // Повторяем попытку с новыми токенами
        return await processUserEmails({
          ...user,
          google_access_token: newCredentials.access_token,
          google_refresh_token: newCredentials.refresh_token,
          google_token_expiry: newCredentials.expiry_date ? new Date(newCredentials.expiry_date).toISOString() : undefined,
        }, emailRepository);
      } catch (refreshError) {
        console.error(`Failed to refresh tokens for ${user.email}:`, refreshError);
        throw new Error(`Token refresh failed: ${refreshError}`);
      }
    }
    
    throw error;
  }
}

// Экспортируем функцию для тестирования
export { processUserEmails };
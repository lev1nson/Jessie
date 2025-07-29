import { NextRequest, NextResponse } from 'next/server';
import { createServiceSupabase } from '@jessie/lib';
import { GmailService } from '@/lib/gmail/service';
import { EmailRepository } from '@/lib/repositories/emailRepository';
import { FilterConfigRepository } from '@/lib/repositories/filterConfigRepository';
import { EmailFilter } from '@/lib/filters/emailFilter';
import { HtmlParser } from '@/lib/parsers/htmlParser';
import { AttachmentProcessor } from '@/lib/parsers/attachmentProcessor';
import { VectorizationService } from '@/lib/services/vectorizationService';
import { recordEmailSyncMetrics } from '@/lib/monitoring/middleware';
import { recordSystemStatus } from '@/lib/monitoring/metrics';

// Интерфейс для пользователя с токенами
interface UserWithTokens {
  id: string;
  email: string;
  google_access_token: string;
  google_refresh_token: string;
  google_token_expiry?: string;
}

export async function GET(request: NextRequest) {
  const cronStartTime = Date.now();
  
  // Проверяем авторизацию cron job
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('Starting email sync cron job...');
  
  // Record cron job start
  await recordSystemStatus('email_sync_cron', 'healthy', { 
    status: 'started',
    timestamp: new Date().toISOString() 
  });
  
  const supabase = createServiceSupabase();
  const emailRepository = new EmailRepository();
  
  let processedUsers = 0;
  let totalEmailsProcessed = 0;
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
      const userStartTime = Date.now();
      try {
        const emailsProcessed = await processUserEmails(user, emailRepository);
        totalEmailsProcessed += emailsProcessed;
        processedUsers++;
        
        // Record user-specific metrics
        const userSyncDuration = Date.now() - userStartTime;
        await recordEmailSyncMetrics(user.id, emailsProcessed, userSyncDuration);
        
        console.log(`Successfully processed user ${user.email} - ${emailsProcessed} emails`);
      } catch (error) {
        const errorMessage = `Failed to process user ${user.email}: ${error}`;
        console.error(errorMessage);
        errors.push(errorMessage);
        
        // Record error metrics
        const userSyncDuration = Date.now() - userStartTime;
        await recordEmailSyncMetrics(user.id, 0, userSyncDuration, 1);
      }
    }

    const cronDuration = Date.now() - cronStartTime;
    const hasErrors = errors.length > 0;
    
    // Record overall cron job metrics
    await Promise.all([
      recordSystemStatus(
        'email_sync_cron', 
        hasErrors ? 'degraded' : 'healthy', 
        { 
          status: 'completed',
          processedUsers,
          totalEmailsProcessed,
          errors: errors.length,
          duration: cronDuration
        }
      ),
      recordEmailSyncMetrics('system', totalEmailsProcessed, cronDuration, errors.length)
    ]);

    const result = {
      message: 'Email sync completed',
      processedUsers,
      totalEmailsProcessed,
      duration: cronDuration,
      errors: errors.length > 0 ? errors : undefined,
    };

    console.log('Email sync cron job completed:', result);
    
    return NextResponse.json(result);
  } catch (error) {
    const cronDuration = Date.now() - cronStartTime;
    
    // Record critical failure
    await recordSystemStatus('email_sync_cron', 'down', { 
      status: 'failed',
      error: String(error),
      duration: cronDuration
    });
    
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
    
    // Асинхронно запускаем векторизацию сохраненных писем
    if (savedEmails.length > 0) {
      processEmailVectorization(savedEmails, user.id).catch(error => {
        // Логируем ошибку, но не прерываем процесс синхронизации
        console.error(`Vectorization failed for user ${user.email}:`, error);
      });
    }
    
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

/**
 * Асинхронно векторизирует письма пользователя с enhanced error handling
 */
async function processEmailVectorization(savedEmails: any[], userId: string): Promise<void> {
  const vectorizationService = new VectorizationService();
  const startTime = Date.now();
  
  try {
    console.log(`Starting vectorization for ${savedEmails.length} emails for user ${userId}`);
    
    // Фильтруем письма, которые еще не были векторизированы
    const emailsToVectorize = savedEmails.filter(email => !email.vectorized_at);
    const skippedCount = savedEmails.length - emailsToVectorize.length;
    
    if (emailsToVectorize.length === 0) {
      console.log(`All ${savedEmails.length} emails already vectorized for user ${userId} - cost optimization in effect`);
      return;
    }
    
    console.log(`Vectorizing ${emailsToVectorize.length} new emails for user ${userId} (skipped ${skippedCount} already processed)`);
    
    // Преобразуем в формат EmailContent
    const emailContents = emailsToVectorize.map(email => ({
      id: email.id,
      subject: email.subject || '',
      body_text: email.body_text || '',
    }));
    
    // Векторизируем письма батчами с retry логикой
    const result = await vectorizationService.batchVectorizeEmails(emailContents, {
      batchSize: 5, // Небольшие батчи для стабильности
      includeAttachments: true,
      userId: userId,
    });
    
    const duration = Date.now() - startTime;
    const successRate = result.processedCount / emailsToVectorize.length * 100;
    
    // Get cache statistics
    const cacheStats = vectorizationService.getCacheStats();
    
    const costSavings = savedEmails.length > 0 ? (skippedCount / savedEmails.length * 100) : 0;
    
    console.log(`Vectorization completed for user ${userId}:`, {
      processed: result.processedCount,
      total: emailsToVectorize.length,
      totalSaved: savedEmails.length,
      skippedDuplicates: skippedCount,
      costSavingsPercent: `${costSavings.toFixed(1)}%`,
      errors: result.errorCount,
      success: result.success,
      successRate: `${successRate.toFixed(1)}%`,
      durationMs: duration,
      avgTimePerEmail: `${(duration / emailsToVectorize.length).toFixed(0)}ms`,
      cache: {
        hitRate: cacheStats.hitRatePercentage,
        efficiency: cacheStats.cacheEfficiency,
        size: cacheStats.memoryUsage,
      },
    });
    
    // Enhanced error handling with categorization
    if (result.errors.length > 0) {
      const errorCategories = categorizeVectorizationErrors(result.errors);
      
      console.error(`Vectorization errors for user ${userId}:`, {
        total: result.errors.length,
        categories: errorCategories,
        details: result.errors.slice(0, 5), // Log first 5 errors for debugging
      });
      
      // Log persistent failures separately for potential dead letter queue
      const persistentFailures = result.errors.filter(error => 
        error.error.includes('Rate limit') || 
        error.error.includes('quota') ||
        error.error.includes('Invalid API key')
      );
      
      if (persistentFailures.length > 0) {
        console.error(`Persistent vectorization failures requiring attention:`, persistentFailures);
      }
    }
    
  } catch (error) {
    const duration = Date.now() - startTime;
    
    // Separate vectorization errors from email sync errors
    console.error(`Critical vectorization error for user ${userId} (${duration}ms):`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      type: 'VECTORIZATION_CRITICAL_ERROR',
      userId: userId,
      emailCount: savedEmails.length,
    });
    
    // Don't throw - this prevents email sync from failing
    // The error is logged but email sync can continue
  }
}

/**
 * Категоризирует ошибки векторизации для мониторинга
 */
function categorizeVectorizationErrors(errors: Array<{ emailId: string; error: string }>) {
  const categories = {
    rateLimits: 0,
    apiErrors: 0,
    contentErrors: 0,
    networkErrors: 0,
    unknown: 0,
  };
  
  errors.forEach(({ error }) => {
    const errorLower = error.toLowerCase();
    
    if (errorLower.includes('rate limit') || errorLower.includes('quota')) {
      categories.rateLimits++;
    } else if (errorLower.includes('api key') || errorLower.includes('unauthorized')) {
      categories.apiErrors++;
    } else if (errorLower.includes('content') || errorLower.includes('token')) {
      categories.contentErrors++;
    } else if (errorLower.includes('network') || errorLower.includes('timeout')) {
      categories.networkErrors++;
    } else {
      categories.unknown++;
    }
  });
  
  return categories;
}

// Экспортируем функции для тестирования
export { processUserEmails, processEmailVectorization };
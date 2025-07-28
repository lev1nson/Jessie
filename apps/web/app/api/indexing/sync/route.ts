import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createServiceSupabase } from '@jessie/lib';
import { GmailService } from '@lib/gmail/service';
import { EmailRepository } from '@lib/repositories/emailRepository';
import { FilterConfigRepository } from '@lib/repositories/filterConfigRepository';
import { EmailFilter } from '@lib/filters/emailFilter';
import { HtmlParser } from '@lib/parsers/htmlParser';
import { AttachmentProcessor } from '@lib/parsers/attachmentProcessor';

interface UserWithTokens {
  id: string;
  email: string;
  google_access_token: string;
  google_refresh_token: string;
  google_token_expiry?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Create Supabase client with SSR for auth
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

    // Parse request body for optional fromDate parameter
    const body = await request.json().catch(() => ({}));
    const fromDate = body.fromDate ? new Date(body.fromDate) : undefined;

    console.log(`Manual sync triggered by user: ${user.email}${fromDate ? ` from date: ${fromDate.toISOString()}` : ''}`);

    // Get user with Google tokens using service client
    const serviceSupabase = createServiceSupabase();
    const { data: userWithTokens, error: userError } = await serviceSupabase
      .from('users')
      .select('id, email, google_access_token, google_refresh_token, google_token_expiry')
      .eq('id', user.id)
      .not('google_access_token', 'is', null)
      .not('google_refresh_token', 'is', null)
      .single();

    if (userError || !userWithTokens) {
      return NextResponse.json(
        { error: 'User tokens not found. Please re-authenticate with Google.' },
        { status: 400 }
      );
    }

    console.log(`Processing emails for user: ${userWithTokens.email}`);

    // Process emails for this user
    const emailRepository = new EmailRepository();
    const emailsProcessed = await processUserEmails(userWithTokens as UserWithTokens, emailRepository, fromDate);

    return NextResponse.json({ 
      success: true, 
      message: `Sync completed. Processed ${emailsProcessed} emails.`,
      emailsProcessed,
      triggeredAt: new Date().toISOString(),
      fromDate: fromDate?.toISOString()
    });

  } catch (error) {
    console.error('Error triggering sync:', error);
    return NextResponse.json(
      { error: `Internal server error: ${error}` },
      { status: 500 }
    );
  }
}

/**
 * Processes emails for a single user with optional fromDate override
 */
async function processUserEmails(
  user: UserWithTokens,
  emailRepository: EmailRepository,
  fromDateOverride?: Date
): Promise<number> {
  const gmailService = new GmailService();
  const filterConfigRepository = new FilterConfigRepository();
  const emailFilter = new EmailFilter();
  const htmlParser = new HtmlParser();
  const attachmentProcessor = new AttachmentProcessor();
  
  try {
    // Initialize Gmail service with user tokens
    await gmailService.initialize({
      access_token: user.google_access_token,
      refresh_token: user.google_refresh_token,
      expiry_date: user.google_token_expiry ? new Date(user.google_token_expiry).getTime() : undefined,
    });

    // Determine start date - use override if provided, otherwise last email date or 30 days ago
    let afterDate = fromDateOverride;
    if (!afterDate) {
      afterDate = await emailRepository.getLastEmailDate(user.id);
      if (!afterDate) {
        // If this is first run, take emails from last 30 days
        afterDate = new Date();
        afterDate.setDate(afterDate.getDate() - 30);
      }
    }

    console.log(`Fetching emails for ${user.email} after ${afterDate.toISOString()}`);

    // Fetch new emails from Gmail
    const newEmails = await gmailService.fetchNewEmails(afterDate, ['INBOX', 'SENT']);
    
    if (newEmails.length === 0) {
      console.log(`No new emails found for ${user.email}`);
      return 0;
    }

    console.log(`Found ${newEmails.length} emails for ${user.email}`);

    // Filter emails that don't exist in database (deduplication)
    const deduplicatedEmails = await emailRepository.filterNewEmails(newEmails);
    
    if (deduplicatedEmails.length === 0) {
      console.log(`All emails for ${user.email} already exist in database`);
      return 0;
    }

    console.log(`Processing ${deduplicatedEmails.length} new emails for ${user.email}`);

    // Get user filter configurations
    const userFilterConfigs = await filterConfigRepository.getUserFilterConfigs(user.id);

    // Apply content filtering to emails
    const filteredEmails = await emailFilter.filterEmails(deduplicatedEmails, userFilterConfigs);

    // Extract and clean text content
    const processedEmails = await Promise.all(
      filteredEmails.map(async (email) => {
        try {
          // Process HTML content
          if (email.body_html && email.body_html.trim() !== '') {
            const parsedContent = htmlParser.parseHtmlEmail(email.body_html);
            email.body_text = parsedContent.plainText || email.body_text;
          } else if (email.body_text) {
            email.body_text = htmlParser.cleanPlainText(email.body_text);
          }

          // Process attachments if present
          if (email.has_attachments && email.attachments && email.attachments.length > 0) {
            const supportedAttachments = gmailService.getSupportedAttachments(email.attachments);
            
            if (supportedAttachments.length > 0) {
              try {
                const attachmentData = await gmailService.fetchAllAttachments(
                  email.google_message_id, 
                  supportedAttachments
                );

                const validAttachments = attachmentData
                  .filter(data => data.buffer !== null)
                  .map(data => ({ buffer: data.buffer!, info: data.info }));

                if (validAttachments.length > 0) {
                  const processingResult = await attachmentProcessor.processAttachments(validAttachments);
                  
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
              }
            }
          }

          return email;
        } catch (processingError) {
          console.error(`Error processing email content ${email.google_message_id}:`, processingError);
          return email;
        }
      })
    );

    // Get filtering statistics
    const filterStats = emailFilter.getFilteringStats(processedEmails);
    console.log(`Filter stats for ${user.email}:`, filterStats);

    // Save processed emails to database
    const savedEmails = await emailRepository.saveFilteredEmailsBatch(user.id, processedEmails);
    
    console.log(`Successfully saved ${savedEmails.length} emails for ${user.email} (${filterStats.filtered} filtered out)`);
    
    return savedEmails.length;
  } catch (error) {
    // Try to refresh tokens if authentication error occurs
    if (error instanceof Error && error.message.includes('invalid_grant')) {
      console.log(`Attempting to refresh tokens for ${user.email}`);
      
      try {
        const newCredentials = await gmailService.refreshCredentials();
        
        // Update tokens in database
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
        
        // Retry with new tokens
        return await processUserEmails({
          ...user,
          google_access_token: newCredentials.access_token,
          google_refresh_token: newCredentials.refresh_token,
          google_token_expiry: newCredentials.expiry_date ? new Date(newCredentials.expiry_date).toISOString() : undefined,
        }, emailRepository, fromDateOverride);
      } catch (refreshError) {
        console.error(`Failed to refresh tokens for ${user.email}:`, refreshError);
        throw new Error(`Token refresh failed: ${refreshError}`);
      }
    }
    
    throw error;
  }
}
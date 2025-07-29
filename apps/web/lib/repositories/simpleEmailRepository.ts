import { createClient } from '@supabase/supabase-js';

export class SimpleEmailRepository {
  private supabase;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
  }

  async getLastEmailDate(userId: string): Promise<Date | null> {
    try {
      const { data, error } = await this.supabase
        .from('emails')
        .select('date_sent')
        .eq('user_id', userId)
        .order('date_sent', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error getting last email date:', error);
        return null;
      }

      return data && data.length > 0 ? new Date(data[0].date_sent) : null;
    } catch (error) {
      console.error('Error getting last email date:', error);
      return null;
    }
  }

  async filterNewEmails(emails: any[]) {
    // For testing, just return all emails as "new"
    console.log(`Filtering ${emails.length} emails (all marked as new for testing)`);
    return emails;
  }

  async saveFilteredEmailsBatch(userId: string, emails: any[]) {
    try {
      console.log(`Saving ${emails.length} emails for user ${userId}`);
      
      const emailsToSave = emails.map(email => ({
        user_id: userId,
        google_message_id: email.google_message_id,
        thread_id: email.thread_id,
        subject: email.subject,
        sender: email.from_email,
        recipient: email.to_emails?.[0] || 'you@example.com',
        body_text: email.body_text,
        body_html: email.body_html,
        date_sent: email.received_at.toISOString(),
        has_attachments: email.has_attachments || false
      }));

      const { data, error } = await this.supabase
        .from('emails')
        .insert(emailsToSave);

      if (error) {
        console.error('Error saving emails:', error);
        throw error;
      }

      console.log(`Successfully saved ${emailsToSave.length} emails`);
      return emailsToSave;
    } catch (error) {
      console.error('Error in saveFilteredEmailsBatch:', error);
      throw error;
    }
  }

  async getAllEmails(userId: string, limit: number = 50) {
    try {
      const { data, error } = await this.supabase
        .from('emails')
        .select('*')
        .eq('user_id', userId)
        .order('date_sent', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error getting emails:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getAllEmails:', error);
      return [];
    }
  }
}
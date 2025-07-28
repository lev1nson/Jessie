import { createServiceSupabase } from '@jessie/lib';
import { ParsedEmail } from '../gmail/service';
import { FilteredEmail } from '../filters/emailFilter';

export interface EmailRecord {
  id: string;
  user_id: string;
  google_message_id: string;
  thread_id: string;
  subject: string;
  sender: string;
  recipient: string;
  body_text: string;
  body_html: string;
  date_sent: string;
  has_attachments: boolean;
  is_filtered: boolean;
  filter_reason: string | null;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
}

export class EmailRepository {
  private supabase;

  constructor() {
    this.supabase = createServiceSupabase();
  }

  /**
   * Сохраняет письмо в базу данных
   */
  async saveEmail(userId: string, email: ParsedEmail): Promise<EmailRecord | null> {
    try {
      const { data, error } = await this.supabase
        .from('emails')
        .insert({
          user_id: userId,
          google_message_id: email.google_message_id,
          thread_id: email.thread_id,
          subject: email.subject,
          sender: email.sender,
          recipient: email.recipient,
          body_text: email.body_text,
          body_html: email.body_html,
          date_sent: email.date_sent,
          has_attachments: email.has_attachments,
          is_filtered: false,
          filter_reason: null,
          processed_at: null,
        })
        .select()
        .single();

      if (error) {
        console.error('Error saving email:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Failed to save email:', error);
      return null;
    }
  }

  /**
   * Сохраняет отфильтрованное письмо в базу данных
   */
  async saveFilteredEmail(userId: string, email: FilteredEmail): Promise<EmailRecord | null> {
    try {
      const { data, error } = await this.supabase
        .from('emails')
        .insert({
          user_id: userId,
          google_message_id: email.google_message_id,
          thread_id: email.thread_id,
          subject: email.subject,
          sender: email.sender,
          recipient: email.recipient,
          body_text: email.body_text,
          body_html: email.body_html,
          date_sent: email.date_sent,
          has_attachments: email.has_attachments,
          is_filtered: email.is_filtered,
          filter_reason: email.filter_reason,
          processed_at: email.processed_at,
        })
        .select()
        .single();

      if (error) {
        console.error('Error saving filtered email:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Failed to save filtered email:', error);
      return null;
    }
  }

  /**
   * Сохраняет множество писем в одной транзакции
   */
  async saveEmailsBatch(userId: string, emails: ParsedEmail[]): Promise<EmailRecord[]> {
    if (emails.length === 0) {
      return [];
    }

    try {
      const emailsToInsert = emails.map(email => ({
        user_id: userId,
        google_message_id: email.google_message_id,
        thread_id: email.thread_id,
        subject: email.subject,
        sender: email.sender,
        recipient: email.recipient,
        body_text: email.body_text,
        body_html: email.body_html,
        date_sent: email.date_sent,
        has_attachments: email.has_attachments,
        is_filtered: false,
        filter_reason: null,
        processed_at: null,
      }));

      const { data, error } = await this.supabase
        .from('emails')
        .insert(emailsToInsert)
        .select();

      if (error) {
        console.error('Error saving emails batch:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Failed to save emails batch:', error);
      return [];
    }
  }

  /**
   * Сохраняет множество отфильтрованных писем в одной транзакции
   */
  async saveFilteredEmailsBatch(userId: string, emails: FilteredEmail[]): Promise<EmailRecord[]> {
    if (emails.length === 0) {
      return [];
    }

    try {
      const emailsToInsert = emails.map(email => ({
        user_id: userId,
        google_message_id: email.google_message_id,
        thread_id: email.thread_id,
        subject: email.subject,
        sender: email.sender,
        recipient: email.recipient,
        body_text: email.body_text,
        body_html: email.body_html,
        date_sent: email.date_sent,
        has_attachments: email.has_attachments,
        is_filtered: email.is_filtered,
        filter_reason: email.filter_reason,
        processed_at: email.processed_at,
      }));

      const { data, error } = await this.supabase
        .from('emails')
        .insert(emailsToInsert)
        .select();

      if (error) {
        console.error('Error saving filtered emails batch:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Failed to save filtered emails batch:', error);
      return [];
    }
  }

  /**
   * Проверяет существование письма по google_message_id
   */
  async emailExists(googleMessageId: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('emails')
        .select('id')
        .eq('google_message_id', googleMessageId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error checking email existence:', error);
        return false;
      }

      return !!data;
    } catch (error) {
      console.error('Failed to check email existence:', error);
      return false;
    }
  }

  /**
   * Получает последнюю дату письма для пользователя
   */
  async getLastEmailDate(userId: string): Promise<Date | null> {
    try {
      const { data, error } = await this.supabase
        .from('emails')
        .select('date_sent')
        .eq('user_id', userId)
        .order('date_sent', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error getting last email date:', error);
        return null;
      }

      return data ? new Date(data.date_sent) : null;
    } catch (error) {
      console.error('Failed to get last email date:', error);
      return null;
    }
  }

  /**
   * Получает количество писем для пользователя
   */
  async getEmailCount(userId: string): Promise<number> {
    try {
      const { count, error } = await this.supabase
        .from('emails')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (error) {
        console.error('Error getting email count:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Failed to get email count:', error);
      return 0;
    }
  }

  /**
   * Фильтрует новые письма (которых еще нет в базе)
   */
  async filterNewEmails(emails: ParsedEmail[]): Promise<ParsedEmail[]> {
    if (emails.length === 0) {
      return [];
    }

    try {
      const googleMessageIds = emails.map(email => email.google_message_id);
      
      const { data, error } = await this.supabase
        .from('emails')
        .select('google_message_id')
        .in('google_message_id', googleMessageIds);

      if (error) {
        console.error('Error filtering new emails:', error);
        return emails; // В случае ошибки возвращаем все письма
      }

      const existingIds = new Set(data?.map(row => row.google_message_id) || []);
      
      return emails.filter(email => !existingIds.has(email.google_message_id));
    } catch (error) {
      console.error('Failed to filter new emails:', error);
      return emails; // В случае ошибки возвращаем все письма
    }
  }

  /**
   * Получает письма пользователя с пагинацией
   */
  async getUserEmails(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<EmailRecord[]> {
    try {
      const { data, error } = await this.supabase
        .from('emails')
        .select('*')
        .eq('user_id', userId)
        .order('date_sent', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Error getting user emails:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Failed to get user emails:', error);
      return [];
    }
  }

  /**
   * Получает только нефильтрованные письма пользователя
   */
  async getUnfilteredEmails(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<EmailRecord[]> {
    try {
      const { data, error } = await this.supabase
        .from('emails')
        .select('*')
        .eq('user_id', userId)
        .eq('is_filtered', false)
        .order('date_sent', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Error getting unfiltered emails:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Failed to get unfiltered emails:', error);
      return [];
    }
  }

  /**
   * Получает статистику фильтрации для пользователя
   */
  async getFilterStats(userId: string): Promise<{
    total: number;
    filtered: number;
    unfiltered: number;
    filterReasons: Record<string, number>;
  }> {
    try {
      // Get total count
      const { count: total, error: totalError } = await this.supabase
        .from('emails')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (totalError) {
        console.error('Error getting total email count:', totalError);
        return { total: 0, filtered: 0, unfiltered: 0, filterReasons: {} };
      }

      // Get filtered count
      const { count: filtered, error: filteredError } = await this.supabase
        .from('emails')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_filtered', true);

      if (filteredError) {
        console.error('Error getting filtered email count:', filteredError);
        return { total: total || 0, filtered: 0, unfiltered: total || 0, filterReasons: {} };
      }

      // Get filter reasons
      const { data: reasonsData, error: reasonsError } = await this.supabase
        .from('emails')
        .select('filter_reason')
        .eq('user_id', userId)
        .eq('is_filtered', true)
        .not('filter_reason', 'is', null);

      const filterReasons: Record<string, number> = {};
      if (!reasonsError && reasonsData) {
        for (const record of reasonsData) {
          if (record.filter_reason) {
            filterReasons[record.filter_reason] = (filterReasons[record.filter_reason] || 0) + 1;
          }
        }
      }

      return {
        total: total || 0,
        filtered: filtered || 0,
        unfiltered: (total || 0) - (filtered || 0),
        filterReasons,
      };
    } catch (error) {
      console.error('Failed to get filter stats:', error);
      return { total: 0, filtered: 0, unfiltered: 0, filterReasons: {} };
    }
  }
}
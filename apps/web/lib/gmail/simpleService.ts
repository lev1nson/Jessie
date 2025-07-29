// Simplified Gmail Service for testing
export class SimpleGmailService {
  
  async initialize(credentials: any) {
    console.log('Gmail service initialized with credentials');
    return true;
  }

  async fetchNewEmails(afterDate: Date, folders: string[]) {
    console.log(`Simulating fetch of emails after ${afterDate.toISOString()}`);
    
    // Return sample email data
    return [
      {
        id: `email_${Date.now()}_1`,
        google_message_id: `msg_${Date.now()}_1`,
        thread_id: `thread_${Date.now()}_1`,
        subject: 'Test Email 1 - Project Discussion',
        from_email: 'john.smith@example.com',
        from_name: 'John Smith',
        to_emails: ['you@example.com'],
        cc_emails: [],
        bcc_emails: [],
        body_text: 'This is a test email about our upcoming project. We need to discuss the timeline and requirements.',
        body_html: '<p>This is a test email about our upcoming project. We need to discuss the timeline and requirements.</p>',
        received_at: new Date(Date.now() - 86400000), // 1 day ago
        has_attachments: false,
        attachments: [],
        labels: ['INBOX'],
        is_read: false,
        is_important: false,
        folder: 'INBOX'
      },
      {
        id: `email_${Date.now()}_2`,
        google_message_id: `msg_${Date.now()}_2`,
        thread_id: `thread_${Date.now()}_2`,
        subject: 'Test Email 2 - Meeting Notes',
        from_email: 'sarah.jones@example.com',
        from_name: 'Sarah Jones',
        to_emails: ['you@example.com'],
        cc_emails: [],
        bcc_emails: [],
        body_text: 'Here are the meeting notes from yesterday. Please review and let me know if anything is missing.',
        body_html: '<p>Here are the meeting notes from yesterday. Please review and let me know if anything is missing.</p>',
        received_at: new Date(Date.now() - 43200000), // 12 hours ago
        has_attachments: true,
        attachments: [
          {
            id: 'att_1',
            filename: 'meeting_notes.pdf',
            mime_type: 'application/pdf',
            size: 1024000
          }
        ],
        labels: ['INBOX'],
        is_read: false,
        is_important: true,
        folder: 'INBOX'
      },
      {
        id: `email_${Date.now()}_3`,
        google_message_id: `msg_${Date.now()}_3`,
        thread_id: `thread_${Date.now()}_3`,
        subject: 'Test Email 3 - Budget Approval',
        from_email: 'finance@example.com',
        from_name: 'Finance Department',
        to_emails: ['you@example.com'],
        cc_emails: ['manager@example.com'],
        bcc_emails: [],
        body_text: 'Your budget request has been approved. The funds will be available next week.',
        body_html: '<p>Your budget request has been approved. The funds will be available next week.</p>',
        received_at: new Date(Date.now() - 21600000), // 6 hours ago
        has_attachments: false,
        attachments: [],
        labels: ['INBOX', 'IMPORTANT'],
        is_read: true,
        is_important: true,
        folder: 'INBOX'
      }
    ];
  }

  async refreshCredentials() {
    console.log('Simulating token refresh');
    return {
      access_token: 'new_access_token',
      refresh_token: 'new_refresh_token',
      expiry_date: Date.now() + 3600000 // 1 hour from now
    };
  }
}
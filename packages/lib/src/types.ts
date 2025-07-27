// Core database types
export interface User {
  id: string;
  email: string;
  google_id: string;
  name: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Email {
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

export interface EmailVector {
  id: string;
  email_id: string;
  content: string;
  embedding: number[];
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface ChatSession {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

// API types
export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
}

export interface SearchQuery {
  query: string;
  limit?: number;
  offset?: number;
  filters?: Record<string, unknown>;
}

export interface SearchResult {
  emails: Email[];
  total: number;
  page: number;
  limit: number;
}

// Content filtering types
export interface FilterConfig {
  id: string;
  user_id: string;
  domain_pattern: string;
  filter_type: 'blacklist' | 'whitelist';
  created_at: string;
}

export interface FilterResult {
  isFiltered: boolean;
  reason: string | null;
  confidence: number;
}

export interface AttachmentInfo {
  id: string;
  email_id: string;
  filename: string;
  mime_type: string;
  size: number;
  google_attachment_id: string;
  created_at: string;
}

export interface ParsedAttachment {
  filename: string;
  mime_type: string;
  size: number;
  content: string;
  attachment_id: string;
}
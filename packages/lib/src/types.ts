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
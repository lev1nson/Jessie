export interface Chat {
  id: string;
  userId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  isActive?: boolean;
  lastMessage?: string;
}

export interface EmailSource {
  id: string;
  similarity: number;
  metadata: Record<string, unknown>;
}

export interface Message {
  id: string;
  chatId: string;
  role: 'user' | 'assistant';
  content: string;
  sourceEmailIds?: string[];
  sources?: EmailSource[];
  createdAt: Date;
  status?: 'pending' | 'sent' | 'failed';
  retryCount?: number;
  error?: string;
}

export interface ChatState {
  chats: Chat[];
  currentChat: Chat | null;
  messages: Message[];
  loading: {
    chats: boolean;
    messages: boolean;
    sending: boolean;
  };
  error: {
    chats: string | null;
    messages: string | null;
    sending: string | null;
  };
}

export interface CreateChatRequest {
  title?: string;
  firstMessage?: string;
}

export interface SendMessageRequest {
  chatId: string;
  content: string;
}

export interface RetryConfig {
  maxRetries: number;
  retryDelays: number[]; // delays in ms for each retry attempt
}

export interface ChatResponse {
  chat: Chat;
}

export interface MessagesResponse {
  messages: Message[];
  hasMore: boolean;
  nextCursor?: string;
}

export interface SendMessageResponse {
  message: Message;
  assistantMessage?: Message;
}
export interface Chat {
  id: string;
  userId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  isActive?: boolean;
  lastMessage?: string;
}

export interface Message {
  id: string;
  chatId: string;
  role: 'user' | 'assistant';
  content: string;
  sourceEmailIds?: string[];
  createdAt: Date;
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
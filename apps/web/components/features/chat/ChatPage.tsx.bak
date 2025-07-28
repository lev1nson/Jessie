'use client';

import { ChatLayout } from './ChatLayout';
import { ChatList } from './ChatList';
import { ChatInterface } from './ChatInterface';
import { useChat } from '../../../hooks/useChat';
import { ErrorAlert } from '../../ui/ErrorAlert';

export function ChatPage() {
  const { 
    chats, 
    currentChat, 
    loading, 
    error, 
    selectChat, 
    startNewChat,
    clearError 
  } = useChat();

  const handleChatSelect = async (chatId: string) => {
    try {
      await selectChat(chatId);
    } catch (error) {
      console.error('Failed to select chat:', error);
    }
  };

  const handleNewChat = async () => {
    try {
      await startNewChat();
    } catch (error) {
      console.error('Failed to create new chat:', error);
    }
  };

  // Transform chats for ChatList component
  const chatListData = chats.map(chat => ({
    id: chat.id,
    title: chat.title,
    lastMessage: chat.lastMessage,
    updatedAt: chat.updatedAt,
    isActive: chat.id === currentChat?.id,
  }));

  return (
    <div className="h-screen" role="application" aria-label="Jessie Email Assistant">
      {/* Global error for chat loading */}
      {error.chats && (
        <div className="p-4 border-b border-border bg-background">
          <ErrorAlert
            message={error.chats}
            onClose={() => clearError('chats')}
            onRetry={() => window.location.reload()}
          />
        </div>
      )}

      <ChatLayout
        sidebar={
          <ChatList
            chats={chatListData}
            activeChat={currentChat?.id}
            onChatSelect={handleChatSelect}
            onNewChat={handleNewChat}
            loading={loading.chats}
          />
        }
      >
        <ChatInterface />
      </ChatLayout>
    </div>
  );
}
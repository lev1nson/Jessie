'use client';

import { ChatList, type Chat } from './ChatList';
import { AuthStatus } from '../auth/AuthStatus';
import { useChat } from '../../../hooks/useChat';

interface ChatSidebarProps {
  className?: string;
}

export function ChatSidebar({ className }: ChatSidebarProps) {
  const { 
    chats, 
    activeChat, 
    loading, 
    selectChat, 
    createNewChat 
  } = useChat();

  const handleChatSelect = (chatId: string) => {
    selectChat(chatId);
  };

  const handleNewChat = () => {
    createNewChat();
  };

  const handleLogout = () => {
    // AuthStatus component handles the logout logic
  };

  return (
    <div className="flex flex-col h-full">
      {/* User Profile / Auth Status - Fixed at top */}
      <div className="p-4 border-b border-border bg-card">
        <AuthStatus 
          showLogout={true}
          onLogout={handleLogout}
          className="w-full"
        />
      </div>

      {/* Chat List - Takes remaining space */}
      <div className="flex-1 overflow-hidden">
        <ChatList
          chats={chats}
          activeChat={activeChat}
          onChatSelect={handleChatSelect}
          onNewChat={handleNewChat}
          loading={loading.chats}
        />
      </div>
    </div>
  );
}
'use client';

import { ChatMessages } from './ChatMessages';
import { MessageInput } from './MessageInput';
import { useChat } from '../../../hooks/useChat';
import { ErrorAlert } from '../../ui/ErrorAlert';

export function ChatInterface() {
  const { 
    messages, 
    loading, 
    error, 
    sendMessageInCurrentChat, 
    clearError 
  } = useChat();

  const handleSendMessage = async (content: string) => {
    console.log('Sending message:', content);
    try {
      const result = await sendMessageInCurrentChat(content);
      console.log('Message sent successfully:', result);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleRetry = () => {
    clearError('messages');
    clearError('sending');
  };

  return (
    <div className="flex flex-col h-full" role="main" aria-label="Chat interface">
      {/* Error Alerts */}
      {error.messages && (
        <div className="p-4 border-b border-border">
          <ErrorAlert
            message={error.messages}
            onDismiss={() => clearError('messages')}
            onRetry={handleRetry}
          />
        </div>
      )}

      {error.sending && (
        <div className="p-4 border-b border-border">
          <ErrorAlert
            message={error.sending}
            onDismiss={() => clearError('sending')}
            onRetry={handleRetry}
          />
        </div>
      )}

      {/* Chat Messages Area */}
      <ChatMessages
        messages={messages}
        loading={loading.messages || loading.sending}
        error={error.messages || error.sending}
        onRetry={handleRetry}
      />

      {/* Message Input */}
      <MessageInput
        onSendMessage={handleSendMessage}
        loading={loading.sending}
        disabled={loading.messages}
      />
    </div>
  );
}
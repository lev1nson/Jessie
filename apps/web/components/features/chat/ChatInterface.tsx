'use client';

import { ChatMessages } from './ChatMessages';
import { MessageInput } from './MessageInput';
import { useChat } from '../../../hooks/useChat';
import { ErrorAlert } from '../../ui/ErrorAlert';
import { RateLimitAlert } from '../../ui/RateLimitAlert';

export function ChatInterface() {
  const { 
    messages, 
    loading, 
    error, 
    sendMessageInCurrentChat, 
    retryMessage,
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

  // Helper function to check if error is rate limiting
  const isRateLimitError = (errorMessage: string): boolean => {
    return errorMessage.toLowerCase().includes('rate limit') ||
           errorMessage.toLowerCase().includes('too many requests') ||
           errorMessage.includes('429');
  };

  return (
    <div className="flex flex-col h-full" role="main" aria-label="Chat interface">
      {/* Error Alerts */}
      {error.messages && (
        <div className="p-4 border-b border-border">
          {isRateLimitError(error.messages) ? (
            <RateLimitAlert
              message={error.messages}
              onDismiss={() => clearError('messages')}
              onRetry={handleRetry}
              cooldownSeconds={60}
            />
          ) : (
            <ErrorAlert
              message={error.messages}
              onDismiss={() => clearError('messages')}
              onRetry={handleRetry}
            />
          )}
        </div>
      )}

      {error.sending && (
        <div className="p-4 border-b border-border">
          {isRateLimitError(error.sending) ? (
            <RateLimitAlert
              message={error.sending}
              onDismiss={() => clearError('sending')}
              onRetry={handleRetry}
              cooldownSeconds={60}
            />
          ) : (
            <ErrorAlert
              message={error.sending}
              onDismiss={() => clearError('sending')}
              onRetry={handleRetry}
            />
          )}
        </div>
      )}

      {/* Chat Messages Area */}
      <ChatMessages
        messages={messages}
        loading={loading.messages || loading.sending}
        error={error.messages || error.sending}
        onRetry={handleRetry}
        onRetryMessage={retryMessage}
      />

      {/* Message Input */}
      <MessageInput
        onSendMessage={handleSendMessage}
        loading={loading.sending}
        disabled={loading.messages || (error.sending && isRateLimitError(error.sending))}
        placeholder={
          error.sending && isRateLimitError(error.sending)
            ? "Rate limited - please wait before sending more messages..."
            : "Ask me about your emails..."
        }
      />
    </div>
  );
}
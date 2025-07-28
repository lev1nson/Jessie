'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Send, Loader2 } from 'lucide-react';

interface MessageInputProps {
  onSendMessage: (message: string) => void;
  loading?: boolean;
  disabled?: boolean;
  placeholder?: string;
  maxLength?: number;
}

export function MessageInput({ 
  onSendMessage, 
  loading = false, 
  disabled = false,
  placeholder = "Ask me about your emails...",
  maxLength = 4000
}: MessageInputProps) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [message]);

  const handleSend = () => {
    if (!message.trim() || loading || disabled) return;
    
    onSendMessage(message.trim());
    setMessage('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter to send (unless Shift is held for new line)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    
    // Ctrl+Enter to send (alternative method)
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isMessageValid = message.trim().length > 0 && message.length <= maxLength;
  const remainingChars = maxLength - message.length;

  return (
    <div className="border-t border-border bg-background/95 backdrop-blur-sm">
      <div className="p-4 max-w-4xl mx-auto">
        <div className="relative flex items-end gap-3">
          {/* Message Input */}
          <div className="flex-1">
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                disabled={loading || disabled}
                rows={1}
                className={`
                  w-full resize-none rounded-2xl border border-border bg-background px-4 py-3 pr-12
                  text-sm placeholder:text-muted-foreground
                  focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-all duration-200
                  ${message.length > maxLength ? 'border-destructive focus:ring-destructive/50' : ''}
                `}
                style={{ 
                  minHeight: '48px',
                  maxHeight: '200px'
                }}
              />
              
              {/* Character Counter */}
              {message.length > maxLength * 0.8 && (
                <div className={`
                  absolute bottom-2 right-12 text-xs
                  ${remainingChars < 0 ? 'text-destructive' : 'text-muted-foreground'}
                `}>
                  {remainingChars < 0 ? `${Math.abs(remainingChars)} over` : remainingChars}
                </div>
              )}
            </div>

            {/* Keyboard Shortcuts Hint */}
            <div className="mt-2 text-xs text-muted-foreground">
              Press <kbd className="px-1 py-0.5 rounded text-xs bg-muted border">Enter</kbd> to send, 
              <kbd className="px-1 py-0.5 rounded text-xs bg-muted border ml-1">Shift + Enter</kbd> for new line
            </div>
          </div>

          {/* Send Button */}
          <Button
            onClick={handleSend}
            disabled={!isMessageValid || loading || disabled}
            size="lg"
            className="h-12 w-12 p-0 rounded-2xl transition-all duration-200 hover:scale-105 active:scale-95"
            title={!isMessageValid ? 'Enter a message to send' : 'Send message'}
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
            <span className="sr-only">Send message</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
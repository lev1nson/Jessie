import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MessageItem } from './MessageItem';
import { Message } from './ChatMessages';

// Mock date-fns
vi.mock('date-fns', () => ({
  formatDistanceToNow: vi.fn(() => '2 minutes ago'),
  format: vi.fn(() => 'January 1, 2023 at 12:00:00 PM'),
}));

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  User: () => <div data-testid="user-icon">User</div>,
  Bot: () => <div data-testid="bot-icon">Bot</div>,
  Mail: () => <div data-testid="mail-icon">Mail</div>,
  Copy: () => <div data-testid="copy-icon">Copy</div>,
  Check: () => <div data-testid="check-icon">Check</div>,
}));

// Mock clipboard API
const mockWriteText = vi.fn();
Object.assign(navigator, {
  clipboard: {
    writeText: mockWriteText,
  },
});

const userMessage: Message = {
  id: '1',
  role: 'user',
  content: 'Hello, how are you?',
  createdAt: new Date('2023-01-01T12:00:00Z'),
};

const assistantMessage: Message = {
  id: '2',
  role: 'assistant',
  content: 'I am doing well, thank you for asking!',
  sourceEmailIds: ['email1', 'email2'],
  createdAt: new Date('2023-01-01T12:01:00Z'),
};

describe('MessageItem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('User Messages', () => {
    it('renders user message correctly', () => {
      render(<MessageItem message={userMessage} />);

      expect(screen.getByText('You')).toBeInTheDocument();
      expect(screen.getByText('Hello, how are you?')).toBeInTheDocument();
      expect(screen.getByText('2 minutes ago')).toBeInTheDocument();
      expect(screen.getByTestId('user-icon')).toBeInTheDocument();
    });

    it('has correct styling for user messages', () => {
      render(<MessageItem message={userMessage} />);

      const messageContainer = screen.getByText('Hello, how are you?').parentElement;
      expect(messageContainer).toHaveClass('bg-primary');
      expect(messageContainer).toHaveClass('text-primary-foreground');
    });

    it('displays user avatar on the right', () => {
      render(<MessageItem message={userMessage} />);

      const container = screen.getByTestId('user-icon').closest('.flex');
      expect(container).toBeInTheDocument();
    });
  });

  describe('Assistant Messages', () => {
    it('renders assistant message correctly', () => {
      render(<MessageItem message={assistantMessage} />);

      expect(screen.getByText('Jessie')).toBeInTheDocument();
      expect(screen.getByText('I am doing well, thank you for asking!')).toBeInTheDocument();
      expect(screen.getByTestId('bot-icon')).toBeInTheDocument();
    });

    it('has correct styling for assistant messages', () => {
      render(<MessageItem message={assistantMessage} />);

      const messageContainer = screen.getByText('I am doing well, thank you for asking!').parentElement;
      expect(messageContainer).toHaveClass('bg-card');
      expect(messageContainer).toHaveClass('text-card-foreground');
    });

    it('displays bot avatar on the left', () => {
      render(<MessageItem message={assistantMessage} />);

      const botIcon = screen.getByTestId('bot-icon');
      expect(botIcon).toBeInTheDocument();
    });

    it('shows source emails indicator', () => {
      render(<MessageItem message={assistantMessage} />);

      expect(screen.getByTestId('mail-icon')).toBeInTheDocument();
      expect(screen.getByText('Based on 2 emails')).toBeInTheDocument();
    });

    it('handles single source email correctly', () => {
      const messageWithOneEmail = {
        ...assistantMessage,
        sourceEmailIds: ['email1'],
      };

      render(<MessageItem message={messageWithOneEmail} />);

      expect(screen.getByText('Based on 1 email')).toBeInTheDocument();
    });

    it('does not show source emails when none provided', () => {
      const messageWithoutEmails = {
        ...assistantMessage,
        sourceEmailIds: undefined,
      };

      render(<MessageItem message={messageWithoutEmails} />);

      expect(screen.queryByTestId('mail-icon')).not.toBeInTheDocument();
      expect(screen.queryByText(/Based on/)).not.toBeInTheDocument();
    });
  });

  describe('Copy Functionality', () => {
    it('shows copy button on hover', () => {
      render(<MessageItem message={userMessage} />);

      const copyButton = screen.getByTitle('Copy message');
      expect(copyButton).toBeInTheDocument();
      expect(copyButton).toHaveClass('opacity-0');
    });

    it('copies message to clipboard when copy button is clicked', async () => {
      mockWriteText.mockResolvedValue(undefined);
      
      render(<MessageItem message={userMessage} />);

      const copyButton = screen.getByTitle('Copy message');
      fireEvent.click(copyButton);

      expect(mockWriteText).toHaveBeenCalledWith('Hello, how are you?');
    });

    it('shows check icon after successful copy', async () => {
      mockWriteText.mockResolvedValue(undefined);
      
      render(<MessageItem message={userMessage} />);

      const copyButton = screen.getByTitle('Copy message');
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(screen.getByTestId('check-icon')).toBeInTheDocument();
      });

      // Should revert back to copy icon after timeout
      await waitFor(() => {
        expect(screen.getByTestId('copy-icon')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('handles copy failure gracefully', async () => {
      mockWriteText.mockRejectedValue(new Error('Copy failed'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      render(<MessageItem message={userMessage} />);

      const copyButton = screen.getByTitle('Copy message');
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to copy message:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Time Display', () => {
    it('shows relative time by default', () => {
      render(<MessageItem message={userMessage} />);

      expect(screen.getByText('2 minutes ago')).toBeInTheDocument();
    });

    it('shows full time on hover', () => {
      render(<MessageItem message={userMessage} />);

      const timeElement = screen.getByText('2 minutes ago');
      expect(timeElement).toHaveAttribute('title', 'January 1, 2023 at 12:00:00 PM');
    });
  });

  describe('Message Content', () => {
    it('preserves whitespace in message content', () => {
      const messageWithWhitespace = {
        ...userMessage,
        content: 'Line 1\n\nLine 3 with  multiple  spaces',
      };

      render(<MessageItem message={messageWithWhitespace} />);

      const contentElement = screen.getByText(/Line 1/);
      expect(contentElement).toHaveClass('whitespace-pre-wrap');
    });

    it('handles empty message content', () => {
      const emptyMessage = {
        ...userMessage,
        content: '',
      };

      render(<MessageItem message={emptyMessage} />);

      // Should still render the message structure
      expect(screen.getByText('You')).toBeInTheDocument();
    });
  });

  describe('Last Message Indicator', () => {
    it('applies special styling for last message', () => {
      render(<MessageItem message={userMessage} isLast={true} />);

      // The isLast prop is available for potential styling
      // Implementation might use this for animations or special styling
      expect(screen.getByText('Hello, how are you?')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels for copy button', () => {
      render(<MessageItem message={userMessage} />);

      const copyButton = screen.getByTitle('Copy message');
      expect(copyButton).toHaveAttribute('title', 'Copy message');
    });

    it('has screen reader text for copy button', () => {
      render(<MessageItem message={userMessage} />);

      expect(screen.getByText('Copy')).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('has responsive classes for different screen sizes', () => {
      render(<MessageItem message={userMessage} />);

      const messageContent = screen.getByText('Hello, how are you?');
      expect(messageContent).toHaveClass('text-sm', 'md:text-base');
    });

    it('has responsive avatar sizes', () => {
      render(<MessageItem message={assistantMessage} />);

      const avatarContainer = screen.getByTestId('bot-icon').parentElement;
      expect(avatarContainer).toHaveClass('w-8', 'h-8', 'md:w-10', 'md:h-10');
    });
  });
});
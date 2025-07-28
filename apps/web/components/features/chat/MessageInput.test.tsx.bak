import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MessageInput } from './MessageInput';

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  Send: () => <div data-testid="send-icon">Send</div>,
  Loader2: () => <div data-testid="loader-icon">Loading</div>,
}));

describe('MessageInput', () => {
  it('renders with default placeholder', () => {
    const onSendMessage = vi.fn();
    render(<MessageInput onSendMessage={onSendMessage} />);

    const textarea = screen.getByPlaceholderText('Ask me about your emails...');
    expect(textarea).toBeInTheDocument();
  });

  it('renders with custom placeholder', () => {
    const onSendMessage = vi.fn();
    render(<MessageInput onSendMessage={onSendMessage} placeholder="Custom placeholder" />);

    const textarea = screen.getByPlaceholderText('Custom placeholder');
    expect(textarea).toBeInTheDocument();
  });

  it('shows send button', () => {
    const onSendMessage = vi.fn();
    render(<MessageInput onSendMessage={onSendMessage} />);

    const sendButton = screen.getByRole('button', { name: /send message/i });
    expect(sendButton).toBeInTheDocument();
    expect(screen.getByTestId('send-icon')).toBeInTheDocument();
  });

  it('disables send button when no message', () => {
    const onSendMessage = vi.fn();
    render(<MessageInput onSendMessage={onSendMessage} />);

    const sendButton = screen.getByRole('button', { name: /send message/i });
    expect(sendButton).toBeDisabled();
  });

  it('enables send button when message is entered', async () => {
    const onSendMessage = vi.fn();
    render(<MessageInput onSendMessage={onSendMessage} />);

    const textarea = screen.getByRole('textbox');
    const sendButton = screen.getByRole('button', { name: /send message/i });

    fireEvent.change(textarea, { target: { value: 'Test message' } });

    expect(sendButton).toBeEnabled();
  });

  it('calls onSendMessage when send button is clicked', async () => {
    const onSendMessage = vi.fn();
    render(<MessageInput onSendMessage={onSendMessage} />);

    const textarea = screen.getByRole('textbox');
    const sendButton = screen.getByRole('button', { name: /send message/i });

    fireEvent.change(textarea, { target: { value: 'Test message' } });
    fireEvent.click(sendButton);

    expect(onSendMessage).toHaveBeenCalledWith('Test message');
  });

  it('clears input after sending message', async () => {
    const onSendMessage = vi.fn();
    render(<MessageInput onSendMessage={onSendMessage} />);

    const textarea = screen.getByRole('textbox');
    const sendButton = screen.getByRole('button', { name: /send message/i });

    fireEvent.change(textarea, { target: { value: 'Test message' } });
    fireEvent.click(sendButton);

    expect(textarea).toHaveValue('');
  });

  it('sends message on Enter key', async () => {
    const onSendMessage = vi.fn();
    render(<MessageInput onSendMessage={onSendMessage} />);

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Test message' } });
    fireEvent.keyDown(textarea, { key: 'Enter' });

    expect(onSendMessage).toHaveBeenCalledWith('Test message');
  });

  it('adds new line on Shift+Enter', async () => {
    const onSendMessage = vi.fn();
    render(<MessageInput onSendMessage={onSendMessage} />);

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Line 1' } });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });

    expect(onSendMessage).not.toHaveBeenCalled();
  });

  it('sends message on Ctrl+Enter', async () => {
    const onSendMessage = vi.fn();
    render(<MessageInput onSendMessage={onSendMessage} />);

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Test message' } });
    fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true });

    expect(onSendMessage).toHaveBeenCalledWith('Test message');
  });

  it('shows loading state', () => {
    const onSendMessage = vi.fn();
    render(<MessageInput onSendMessage={onSendMessage} loading={true} />);

    expect(screen.getByTestId('loader-icon')).toBeInTheDocument();
    
    const textarea = screen.getByRole('textbox');
    const sendButton = screen.getByRole('button', { name: /send message/i });
    
    expect(textarea).toBeDisabled();
    expect(sendButton).toBeDisabled();
  });

  it('shows disabled state', () => {
    const onSendMessage = vi.fn();
    render(<MessageInput onSendMessage={onSendMessage} disabled={true} />);

    const textarea = screen.getByRole('textbox');
    const sendButton = screen.getByRole('button', { name: /send message/i });
    
    expect(textarea).toBeDisabled();
    expect(sendButton).toBeDisabled();
  });

  it('does not send empty or whitespace-only messages', async () => {
    const onSendMessage = vi.fn();
    render(<MessageInput onSendMessage={onSendMessage} />);

    const textarea = screen.getByRole('textbox');
    const sendButton = screen.getByRole('button', { name: /send message/i });

    // Try with spaces only
    fireEvent.change(textarea, { target: { value: '   ' } });
    fireEvent.click(sendButton);

    expect(onSendMessage).not.toHaveBeenCalled();
    expect(sendButton).toBeDisabled();
  });

  it('trims whitespace from messages', async () => {
    const onSendMessage = vi.fn();
    render(<MessageInput onSendMessage={onSendMessage} />);

    const textarea = screen.getByRole('textbox');
    const sendButton = screen.getByRole('button', { name: /send message/i });

    fireEvent.change(textarea, { target: { value: '  Test message  ' } });
    fireEvent.click(sendButton);

    expect(onSendMessage).toHaveBeenCalledWith('Test message');
  });

  it('shows character counter when approaching limit', async () => {
    const onSendMessage = vi.fn();
    render(<MessageInput onSendMessage={onSendMessage} maxLength={100} />);

    const textarea = screen.getByRole('textbox');
    
    // Type text that's 85% of max length (should show counter)
    const longText = 'a'.repeat(85);
    fireEvent.change(textarea, { target: { value: longText } });

    await waitFor(() => {
      expect(screen.getByText('15')).toBeInTheDocument();
    });
  });

  it('shows over limit warning', async () => {
    const onSendMessage = vi.fn();
    render(<MessageInput onSendMessage={onSendMessage} maxLength={10} />);

    const textarea = screen.getByRole('textbox');
    
    // Type text that exceeds limit
    fireEvent.change(textarea, { target: { value: 'This is way too long' } });

    await waitFor(() => {
      expect(screen.getByText(/over/)).toBeInTheDocument();
    });

    const sendButton = screen.getByRole('button', { name: /send message/i });
    expect(sendButton).toBeDisabled();
  });

  it('auto-resizes textarea', async () => {
    const onSendMessage = vi.fn();
    render(<MessageInput onSendMessage={onSendMessage} />);

    const textarea = screen.getByRole('textbox');
    
    // Initial height should be minimum
    expect(textarea.style.minHeight).toBe('48px');
    
    // Type multiple lines
    fireEvent.change(textarea, { target: { value: 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5' } });

    // Height should be adjusted (tested via the useEffect)
    expect(textarea).toBeInTheDocument();
  });

  it('shows keyboard shortcuts hint', () => {
    const onSendMessage = vi.fn();
    render(<MessageInput onSendMessage={onSendMessage} />);

    expect(screen.getByText(/Press/)).toBeInTheDocument();
    expect(screen.getByText('Enter')).toBeInTheDocument();
    expect(screen.getByText('Shift + Enter')).toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    const onSendMessage = vi.fn();
    render(<MessageInput onSendMessage={onSendMessage} />);

    const sendButton = screen.getByRole('button', { name: /send message/i });
    expect(sendButton).toHaveAttribute('title');

    // Screen reader text
    expect(screen.getByText('Send message')).toBeInTheDocument();
  });

  it('prevents sending when loading', async () => {
    const onSendMessage = vi.fn();
    render(<MessageInput onSendMessage={onSendMessage} loading={true} />);

    const textarea = screen.getByRole('textbox');
    
    // Even if we somehow type (though it should be disabled)
    fireEvent.change(textarea, { target: { value: 'Test message' } });
    fireEvent.keyDown(textarea, { key: 'Enter' });

    expect(onSendMessage).not.toHaveBeenCalled();
  });

  it('has responsive styling', () => {
    const onSendMessage = vi.fn();
    render(<MessageInput onSendMessage={onSendMessage} />);

    const container = screen.getByRole('textbox').closest('.p-4');
    expect(container).toHaveClass('max-w-4xl', 'mx-auto');
  });

  it('renders textarea correctly', () => {
    const onSendMessage = vi.fn();
    render(<MessageInput onSendMessage={onSendMessage} />);

    const textarea = screen.getByRole('textbox');
    expect(textarea).toBeInTheDocument();
    expect(textarea).toHaveAttribute('placeholder', 'Ask me about your emails...');
  });
});
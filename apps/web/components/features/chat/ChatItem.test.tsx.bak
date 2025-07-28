import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChatItem } from './ChatItem';
import { Chat } from './ChatList';

// Mock date-fns
vi.mock('date-fns', () => ({
  formatDistanceToNow: vi.fn(() => '2 minutes ago'),
}));

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  MessageCircle: () => <div data-testid="message-circle-icon">MessageCircle</div>,
  Clock: () => <div data-testid="clock-icon">Clock</div>,
}));

const mockChat: Chat = {
  id: '1',
  title: 'Test Chat',
  lastMessage: 'This is the last message',
  updatedAt: new Date('2023-01-01T12:00:00Z'),
};

describe('ChatItem', () => {
  it('renders chat title and last message', () => {
    render(<ChatItem chat={mockChat} />);

    expect(screen.getByText('Test Chat')).toBeInTheDocument();
    expect(screen.getByText('This is the last message')).toBeInTheDocument();
  });

  it('renders time ago', () => {
    render(<ChatItem chat={mockChat} />);

    expect(screen.getByText('2 minutes ago')).toBeInTheDocument();
  });

  it('shows active state styling', () => {
    render(<ChatItem chat={mockChat} isActive={true} />);

    const chatItem = screen.getByRole('button');
    expect(chatItem).toHaveClass('bg-primary/10');
    expect(chatItem).toHaveAttribute('aria-current', 'page');
  });

  it('shows inactive state styling', () => {
    render(<ChatItem chat={mockChat} isActive={false} />);

    const chatItem = screen.getByRole('button');
    expect(chatItem).not.toHaveClass('bg-primary/10');
    expect(chatItem).not.toHaveAttribute('aria-current');
  });

  it('calls onClick when clicked', () => {
    const onClickMock = vi.fn();
    render(<ChatItem chat={mockChat} onClick={onClickMock} />);

    const chatItem = screen.getByRole('button');
    fireEvent.click(chatItem);

    expect(onClickMock).toHaveBeenCalledOnce();
  });

  it('handles keyboard interactions', () => {
    const onClickMock = vi.fn();
    const onKeyDownMock = vi.fn();
    
    render(
      <ChatItem 
        chat={mockChat} 
        onClick={onClickMock}
        onKeyDown={onKeyDownMock}
        index={0}
      />
    );

    const chatItem = screen.getByRole('button');
    
    // Test Enter key
    fireEvent.keyDown(chatItem, { key: 'Enter' });
    expect(onClickMock).toHaveBeenCalledTimes(1);

    // Test Space key
    fireEvent.keyDown(chatItem, { key: ' ' });
    expect(onClickMock).toHaveBeenCalledTimes(2);

    // Test other keys (should call onKeyDown)
    fireEvent.keyDown(chatItem, { key: 'ArrowDown' });
    expect(onKeyDownMock).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'ArrowDown' }),
      0
    );
  });

  it('has proper accessibility attributes', () => {
    render(<ChatItem chat={mockChat} isActive={true} index={5} />);

    const chatItem = screen.getByRole('button');
    expect(chatItem).toHaveAttribute('tabIndex', '0');
    expect(chatItem).toHaveAttribute('data-chat-item', '5');
    expect(chatItem).toHaveAttribute('aria-label', 'Chat: Test Chat (currently active)');
    expect(chatItem).toHaveAttribute('aria-current', 'page');
  });

  it('has proper accessibility attributes when inactive', () => {
    render(<ChatItem chat={mockChat} isActive={false} />);

    const chatItem = screen.getByRole('button');
    expect(chatItem).toHaveAttribute('aria-label', 'Chat: Test Chat');
    expect(chatItem).not.toHaveAttribute('aria-current');
  });

  it('renders without last message', () => {
    const chatWithoutMessage = { ...mockChat, lastMessage: undefined };
    render(<ChatItem chat={chatWithoutMessage} />);

    expect(screen.getByText('Test Chat')).toBeInTheDocument();
    expect(screen.queryByText('This is the last message')).not.toBeInTheDocument();
  });

  it('shows full time on hover', () => {
    render(<ChatItem chat={mockChat} />);

    const timeElement = screen.getByText('2 minutes ago');
    expect(timeElement).toHaveAttribute('title', mockChat.updatedAt.toLocaleString());
  });

  it('renders MessageCircle icon', () => {
    render(<ChatItem chat={mockChat} />);

    expect(screen.getByTestId('message-circle-icon')).toBeInTheDocument();
  });

  it('renders Clock icon', () => {
    render(<ChatItem chat={mockChat} />);

    expect(screen.getByTestId('clock-icon')).toBeInTheDocument();
  });

  it('has active indicator when active', () => {
    render(<ChatItem chat={mockChat} isActive={true} />);

    const activeIndicator = document.querySelector('.absolute.left-0');
    expect(activeIndicator).toBeInTheDocument();
    expect(activeIndicator).toHaveClass('bg-primary');
  });

  it('does not have active indicator when inactive', () => {
    render(<ChatItem chat={mockChat} isActive={false} />);

    const activeIndicator = document.querySelector('.absolute.left-0');
    expect(activeIndicator).not.toBeInTheDocument();
  });

  it('truncates long titles', () => {
    const longTitleChat = {
      ...mockChat,
      title: 'This is a very long chat title that should be truncated when displayed',
    };
    
    render(<ChatItem chat={longTitleChat} />);

    const titleElement = screen.getByText(longTitleChat.title);
    expect(titleElement).toHaveClass('truncate');
  });

  it('truncates long last messages', () => {
    const longMessageChat = {
      ...mockChat,
      lastMessage: 'This is a very long last message that should be truncated when displayed in the chat item',
    };
    
    render(<ChatItem chat={longMessageChat} />);

    const messageElement = screen.getByText(longMessageChat.lastMessage);
    expect(messageElement).toHaveClass('truncate');
  });
});
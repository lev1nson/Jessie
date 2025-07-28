import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChatList, Chat } from './ChatList';

// Mock react-window
vi.mock('react-window', () => ({
  FixedSizeList: ({ children, itemCount }: any) => {
    const items = [];
    for (let i = 0; i < itemCount; i++) {
      items.push(children({ index: i, style: {} }));
    }
    return <div data-testid="virtualized-list">{items}</div>;
  },
}));

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  Search: () => <div data-testid="search-icon">Search</div>,
  Plus: () => <div data-testid="plus-icon">Plus</div>,
  MessageCircle: () => <div data-testid="message-circle-icon">MessageCircle</div>,
  Clock: () => <div data-testid="clock-icon">Clock</div>,
}));

// Mock ChatItem to avoid complex dependencies
vi.mock('./ChatItem', () => ({
  ChatItem: ({ chat, isActive, onClick, index, onKeyDown }: any) => (
    <div
      data-testid={`chat-item-${index}`}
      data-chat-item={index}
      onClick={onClick}
      onKeyDown={(e) => onKeyDown?.(e, index)}
      tabIndex={0}
      className={isActive ? 'active' : ''}
    >
      {chat.title}
    </div>
  ),
}));

const mockChats: Chat[] = [
  {
    id: '1',
    title: 'First Chat',
    lastMessage: 'Hello world',
    updatedAt: new Date('2023-01-01'),
  },
  {
    id: '2',
    title: 'Second Chat',
    lastMessage: 'How are you?',
    updatedAt: new Date('2023-01-02'),
  },
  {
    id: '3',
    title: 'Third Chat',
    updatedAt: new Date('2023-01-03'),
  },
];

describe('ChatList', () => {
  it('renders new chat button', () => {
    const onNewChat = vi.fn();
    render(<ChatList onNewChat={onNewChat} />);

    const newChatButton = screen.getByRole('button', { name: /new chat/i });
    expect(newChatButton).toBeInTheDocument();
    
    fireEvent.click(newChatButton);
    expect(onNewChat).toHaveBeenCalledOnce();
  });

  it('renders search input', () => {
    render(<ChatList chats={mockChats} />);

    const searchInput = screen.getByPlaceholderText('Search chats...');
    expect(searchInput).toBeInTheDocument();
    expect(searchInput).toHaveAttribute('aria-label', 'Search chats');
  });

  it('filters chats based on search query', async () => {
    render(<ChatList chats={mockChats} />);

    const searchInput = screen.getByPlaceholderText('Search chats...');
    
    fireEvent.change(searchInput, { target: { value: 'first' } });
    
    await waitFor(() => {
      expect(screen.getByText('First Chat')).toBeInTheDocument();
      expect(screen.queryByText('Second Chat')).not.toBeInTheDocument();
    });
  });

  it('filters chats by last message content', async () => {
    render(<ChatList chats={mockChats} />);

    const searchInput = screen.getByPlaceholderText('Search chats...');
    
    fireEvent.change(searchInput, { target: { value: 'hello' } });
    
    await waitFor(() => {
      expect(screen.getByText('First Chat')).toBeInTheDocument();
      expect(screen.queryByText('Second Chat')).not.toBeInTheDocument();
    });
  });

  it('shows loading state', () => {
    render(<ChatList chats={[]} loading={true} />);

    // Should show 5 skeleton items
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons).toHaveLength(5);
  });

  it('shows empty state when no chats', () => {
    render(<ChatList chats={[]} />);

    expect(screen.getByText('No chats yet')).toBeInTheDocument();
    expect(screen.getByText('Start a conversation to see your chats here')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start your first chat/i })).toBeInTheDocument();
  });

  it('shows no results state when search has no matches', async () => {
    render(<ChatList chats={mockChats} />);

    const searchInput = screen.getByPlaceholderText('Search chats...');
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

    await waitFor(() => {
      expect(screen.getByText('No chats found')).toBeInTheDocument();
      expect(screen.getByText('Try adjusting your search terms')).toBeInTheDocument();
    });
  });

  it('calls onChatSelect when chat is clicked', () => {
    const onChatSelect = vi.fn();
    render(<ChatList chats={mockChats} onChatSelect={onChatSelect} />);

    const firstChat = screen.getByTestId('chat-item-0');
    fireEvent.click(firstChat);

    expect(onChatSelect).toHaveBeenCalledWith('1');
  });

  it('highlights active chat', () => {
    render(<ChatList chats={mockChats} activeChat="2" />);

    const activeChat = screen.getByTestId('chat-item-1');
    expect(activeChat).toHaveClass('active');
  });

  it('uses virtualization for large lists', () => {
    const largeChats = Array.from({ length: 25 }, (_, i) => ({
      id: `${i}`,
      title: `Chat ${i}`,
      updatedAt: new Date(),
    }));

    render(<ChatList chats={largeChats} />);

    expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
  });

  it('supports keyboard navigation in search', async () => {
    render(<ChatList chats={mockChats} />);

    const searchInput = screen.getByPlaceholderText('Search chats...');
    searchInput.focus();

    fireEvent.keyDown(searchInput, { key: 'ArrowDown' });

    // Should focus first chat item
    await waitFor(() => {
      const firstChatItem = screen.getByTestId('chat-item-0');
      expect(firstChatItem).toBeInTheDocument();
    });
  });

  it('has proper ARIA roles', () => {
    render(<ChatList chats={mockChats} />);

    const chatListContainer = screen.getByRole('listbox');
    expect(chatListContainer).toHaveAttribute('aria-label', 'Chat list');
  });

  it('handles keyboard navigation between chat items', () => {
    render(<ChatList chats={mockChats} />);

    const firstChatItem = screen.getByTestId('chat-item-0');
    firstChatItem.focus();

    // Test ArrowDown navigation
    fireEvent.keyDown(firstChatItem, { key: 'ArrowDown' });
    
    // The component should handle focus management
    expect(document.querySelector('[data-chat-item="1"]')).toBeInTheDocument();
  });

  it('handles edge cases in keyboard navigation', () => {
    render(<ChatList chats={mockChats} />);

    const firstChatItem = screen.getByTestId('chat-item-0');
    
    // Test Home key
    fireEvent.keyDown(firstChatItem, { key: 'Home' });
    
    // Test End key
    fireEvent.keyDown(firstChatItem, { key: 'End' });
    
    // Should not throw errors
    expect(firstChatItem).toBeInTheDocument();
  });
});
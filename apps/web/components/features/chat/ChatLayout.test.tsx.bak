import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChatLayout } from './ChatLayout';

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  Menu: () => <div data-testid="menu-icon">Menu</div>,
  X: () => <div data-testid="x-icon">X</div>,
}));

describe('ChatLayout', () => {
  it('renders with children and sidebar', () => {
    render(
      <ChatLayout sidebar={<div data-testid="sidebar">Sidebar</div>}>
        <div data-testid="main-content">Main Content</div>
      </ChatLayout>
    );

    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('main-content')).toBeInTheDocument();
  });

  it('shows and hides mobile sidebar correctly', () => {
    render(
      <ChatLayout sidebar={<div data-testid="sidebar">Sidebar</div>}>
        <div>Main Content</div>
      </ChatLayout>
    );

    // Sidebar should be hidden on mobile initially
    const sidebarContainer = screen.getByTestId('sidebar').closest('.fixed');
    expect(sidebarContainer).toHaveClass('-translate-x-full');

    // Open sidebar
    const menuButton = screen.getByRole('button', { name: /open sidebar/i });
    fireEvent.click(menuButton);

    expect(sidebarContainer).toHaveClass('translate-x-0');

    // Close sidebar via close button
    const closeButton = screen.getByRole('button', { name: /close sidebar/i });
    fireEvent.click(closeButton);

    expect(sidebarContainer).toHaveClass('-translate-x-full');
  });

  it('closes sidebar when clicking overlay', () => {
    render(
      <ChatLayout sidebar={<div data-testid="sidebar">Sidebar</div>}>
        <div>Main Content</div>
      </ChatLayout>
    );

    // Open sidebar first
    const menuButton = screen.getByRole('button', { name: /open sidebar/i });
    fireEvent.click(menuButton);

    // Click overlay to close
    const overlay = document.querySelector('.fixed.inset-0.bg-black\\/50');
    expect(overlay).toBeInTheDocument();
    
    fireEvent.click(overlay!);

    const sidebarContainer = screen.getByTestId('sidebar').closest('.fixed');
    expect(sidebarContainer).toHaveClass('-translate-x-full');
  });

  it('displays Jessie title in mobile header', () => {
    render(
      <ChatLayout>
        <div>Main Content</div>
      </ChatLayout>
    );

    expect(screen.getByText('Jessie')).toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    render(
      <ChatLayout sidebar={<div>Sidebar</div>}>
        <div>Main Content</div>
      </ChatLayout>
    );

    const menuButton = screen.getByRole('button', { name: /open sidebar/i });
    const closeButton = screen.getByRole('button', { name: /close sidebar/i });

    expect(menuButton.querySelector('.sr-only')).toBeInTheDocument();
    expect(closeButton.querySelector('.sr-only')).toBeInTheDocument();
  });

  it('renders without sidebar', () => {
    render(
      <ChatLayout>
        <div data-testid="main-content">Main Content</div>
      </ChatLayout>
    );

    expect(screen.getByTestId('main-content')).toBeInTheDocument();
    // Should still render the sidebar container but it would be empty
    expect(document.querySelector('.w-80')).toBeInTheDocument();
  });
});
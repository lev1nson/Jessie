import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthStatus } from './AuthStatus';

// Mock the auth client
const mockSupabaseClient = {
  auth: {
    getSession: vi.fn(),
    onAuthStateChange: vi.fn(() => ({
      data: { subscription: { unsubscribe: vi.fn() } },
    })),
  },
};

vi.mock('../../../lib/auth', () => ({
  createClientSupabaseClient: () => mockSupabaseClient,
}));

// Mock Next.js Image component
vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: any) => <img src={src} alt={alt} {...props} />
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock window.location
const mockLocation = {
  href: '',
};
Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
});

// Mock alert
global.alert = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  mockLocation.href = '';
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('AuthStatus', () => {
  it('should show loading state initially', () => {
    mockSupabaseClient.auth.getSession.mockImplementation(() => 
      new Promise(() => {}) // Never resolves to keep loading state
    );

    render(<AuthStatus />);
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should show "Not signed in" when no user', async () => {
    mockSupabaseClient.auth.getSession.mockResolvedValue({
      data: { session: null },
    });

    render(<AuthStatus />);
    
    await waitFor(() => {
      expect(screen.getByText('Not signed in')).toBeInTheDocument();
    });
  });

  it('should display user information when authenticated', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      user_metadata: {
        full_name: 'Test User',
        avatar_url: 'https://example.com/avatar.jpg',
      },
    };

    mockSupabaseClient.auth.getSession.mockResolvedValue({
      data: { session: { user: mockUser } },
    });

    render(<AuthStatus />);
    
    await waitFor(() => {
      expect(screen.getByText('Test User')).toBeInTheDocument();
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });

    // Check avatar image
    const avatar = screen.getByAltText('Test User');
    expect(avatar).toBeInTheDocument();
    expect(avatar).toHaveAttribute('src', 'https://example.com/avatar.jpg');
  });

  it('should show email as name when full_name is not available', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      user_metadata: {},
    };

    mockSupabaseClient.auth.getSession.mockResolvedValue({
      data: { session: { user: mockUser } },
    });

    render(<AuthStatus />);
    
    await waitFor(() => {
      expect(screen.getAllByText('test@example.com')[0]).toBeInTheDocument();
    });
  });

  it('should show logout button by default', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      user_metadata: { full_name: 'Test User' },
    };

    mockSupabaseClient.auth.getSession.mockResolvedValue({
      data: { session: { user: mockUser } },
    });

    render(<AuthStatus />);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
    });
  });

  it('should hide logout button when showLogout is false', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      user_metadata: { full_name: 'Test User' },
    };

    mockSupabaseClient.auth.getSession.mockResolvedValue({
      data: { session: { user: mockUser } },
    });

    render(<AuthStatus showLogout={false} />);
    
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /sign out/i })).not.toBeInTheDocument();
    });
  });

  it('should handle logout successfully', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      user_metadata: { full_name: 'Test User' },
    };

    mockSupabaseClient.auth.getSession.mockResolvedValue({
      data: { session: { user: mockUser } },
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'Logged out successfully' }),
    });

    render(<AuthStatus />);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
    });

    const logoutButton = screen.getByRole('button', { name: /sign out/i });
    fireEvent.click(logoutButton);

    expect(screen.getByText('Signing out...')).toBeInTheDocument();

    await waitFor(() => {
      expect(mockLocation.href).toBe('/');
    });
  });

  it('should handle logout failure', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      user_metadata: { full_name: 'Test User' },
    };

    mockSupabaseClient.auth.getSession.mockResolvedValue({
      data: { session: { user: mockUser } },
    });

    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Logout failed' }),
    });

    render(<AuthStatus />);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
    });

    const logoutButton = screen.getByRole('button', { name: /sign out/i });
    fireEvent.click(logoutButton);

    await waitFor(() => {
      expect(screen.getByText('Logout failed')).toBeInTheDocument();
    });

    // Button should not be disabled after error
    expect(logoutButton).not.toBeDisabled();
  });

  it('should call onLogout callback', async () => {
    const onLogout = vi.fn();
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      user_metadata: { full_name: 'Test User' },
    };

    mockSupabaseClient.auth.getSession.mockResolvedValue({
      data: { session: { user: mockUser } },
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'Logged out successfully' }),
    });

    render(<AuthStatus onLogout={onLogout} />);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
    });

    const logoutButton = screen.getByRole('button', { name: /sign out/i });
    fireEvent.click(logoutButton);

    await waitFor(() => {
      expect(onLogout).toHaveBeenCalled();
    });
  });

  it('should listen to auth state changes', async () => {
    const mockSubscription = { unsubscribe: vi.fn() };
    mockSupabaseClient.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: mockSubscription },
    });

    mockSupabaseClient.auth.getSession.mockResolvedValue({
      data: { session: null },
    });

    const { unmount } = render(<AuthStatus />);
    
    expect(mockSupabaseClient.auth.onAuthStateChange).toHaveBeenCalled();
    
    unmount();
    
    expect(mockSubscription.unsubscribe).toHaveBeenCalled();
  });

  it('should apply custom className', async () => {
    const customClass = 'custom-auth-status';
    
    mockSupabaseClient.auth.getSession.mockResolvedValue({
      data: { session: null },
    });

    render(<AuthStatus className={customClass} />);
    
    await waitFor(() => {
      const element = screen.getByText('Not signed in');
      expect(element).toHaveClass(customClass);
    });
  });
});
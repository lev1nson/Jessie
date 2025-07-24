import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GoogleLoginButton } from './GoogleLoginButton';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock window.location
const mockLocation = {
  href: '',
  origin: 'http://localhost:3000',
};
Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
});

// Mock alert
global.alert = vi.fn();

beforeEach(() => {
  mockFetch.mockClear();
  mockLocation.href = '';
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('GoogleLoginButton', () => {
  it('should render login button', () => {
    render(<GoogleLoginButton />);
    
    const button = screen.getByRole('button', { name: /continue with google/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('Continue with Google');
  });

  it('should show loading state during login', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ url: 'https://accounts.google.com/oauth/authorize' }),
    });

    render(<GoogleLoginButton />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);

    // Should show loading state immediately
    expect(screen.getByText('Signing in...')).toBeInTheDocument();
    expect(button).toBeDisabled();

    await waitFor(() => {
      expect(mockLocation.href).toBe('https://accounts.google.com/oauth/authorize');
    });
  });

  it('should call onLoading callback', async () => {
    const onLoading = vi.fn();
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ url: 'https://accounts.google.com/oauth/authorize' }),
    });

    render(<GoogleLoginButton onLoading={onLoading} />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(onLoading).toHaveBeenCalledWith(true);

    await waitFor(() => {
      expect(onLoading).toHaveBeenCalledWith(false);
    });
  });

  it('should handle login API failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'OAuth failed' }),
    });

    render(<GoogleLoginButton />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('OAuth failed')).toBeInTheDocument();
    });

    // Button should not be disabled after error
    expect(button).not.toBeDisabled();
    expect(screen.getByText('Continue with Google')).toBeInTheDocument();
  });

  it('should handle network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    render(<GoogleLoginButton />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('should send correct request payload', async () => {
    const redirectTo = 'http://localhost:3000/custom-redirect';
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ url: 'https://accounts.google.com/oauth/authorize' }),
    });

    render(<GoogleLoginButton redirectTo={redirectTo} />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/auth/google/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ redirectTo }),
      });
    });
  });

  it('should use default redirect when none provided', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ url: 'https://accounts.google.com/oauth/authorize' }),
    });

    render(<GoogleLoginButton />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/auth/google/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ redirectTo: 'http://localhost:3000/dashboard' }),
      });
    });
  });

  it('should apply custom className', () => {
    const customClass = 'custom-button-class';
    render(<GoogleLoginButton className={customClass} />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass(customClass);
  });

  it('should display Google logo', () => {
    render(<GoogleLoginButton />);
    
    const logo = screen.getByRole('button').querySelector('svg');
    expect(logo).toBeInTheDocument();
  });

  it('should show retry button on error and handle retry', async () => {
    // First call fails
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'OAuth failed' }),
    });

    // Second call (retry) succeeds
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ url: 'https://accounts.google.com/oauth/authorize' }),
    });

    render(<GoogleLoginButton />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);

    // Wait for error to appear
    await waitFor(() => {
      expect(screen.getByText('OAuth failed')).toBeInTheDocument();
    });

    // Find and click retry button
    const retryButton = screen.getByRole('button', { name: 'Try Again' });
    expect(retryButton).toBeInTheDocument();
    
    fireEvent.click(retryButton);

    // Should make another request
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockLocation.href).toBe('https://accounts.google.com/oauth/authorize');
    });
  });

  it('should limit retry attempts to 3', async () => {
    // All calls fail
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'OAuth failed' }),
    });

    render(<GoogleLoginButton />);
    
    const button = screen.getByRole('button');
    
    // Initial attempt
    fireEvent.click(button);
    await waitFor(() => screen.getByText('OAuth failed'));
    
    // Retry 1
    fireEvent.click(screen.getByRole('button', { name: 'Try Again' }));
    await waitFor(() => screen.getByText('OAuth failed'));
    
    // Retry 2
    fireEvent.click(screen.getByRole('button', { name: 'Try Again' }));
    await waitFor(() => screen.getByText('OAuth failed'));
    
    // Retry 3
    fireEvent.click(screen.getByRole('button', { name: 'Try Again' }));
    await waitFor(() => screen.getByText('OAuth failed'));
    
    // After max retries, should not show retry button
    expect(screen.queryByRole('button', { name: 'Try Again' })).not.toBeInTheDocument();
  });
});
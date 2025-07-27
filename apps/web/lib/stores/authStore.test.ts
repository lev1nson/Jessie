import { describe, it, expect, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useAuthStore, useAuthUser, useAuthSession, useIsAuthenticated, useAuthActions } from './authStore';
import type { User, Session } from '@supabase/supabase-js';

const mockUser: User = {
  id: 'user123',
  email: 'test@example.com',
  aud: 'authenticated',
  role: 'authenticated',
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
  email_confirmed_at: '2024-01-01T00:00:00.000Z',
  last_sign_in_at: '2024-01-01T00:00:00.000Z',
  app_metadata: {},
  user_metadata: {
    full_name: 'Test User',
    avatar_url: 'https://example.com/avatar.jpg',
  },
  identities: [],
};

const mockSession: Session = {
  access_token: 'access-token',
  refresh_token: 'refresh-token',
  expires_in: 3600,
  expires_at: Date.now() / 1000 + 3600,
  token_type: 'bearer',
  user: mockUser,
};

describe('AuthStore', () => {
  beforeEach(() => {
    // Reset store before each test
    act(() => {
      useAuthStore.getState().reset();
    });
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useAuthStore());

    expect(result.current.user).toBe(null);
    expect(result.current.session).toBe(null);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.retryCount).toBe(0);
  });

  it('should set user and update authentication state', () => {
    const { result } = renderHook(() => useAuthStore());

    act(() => {
      result.current.setUser(mockUser);
    });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('should set session and update user and authentication state', () => {
    const { result } = renderHook(() => useAuthStore());

    act(() => {
      result.current.setSession(mockSession);
    });

    expect(result.current.session).toEqual(mockSession);
    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('should handle null session correctly', () => {
    const { result } = renderHook(() => useAuthStore());

    // First set a session
    act(() => {
      result.current.setSession(mockSession);
    });

    expect(result.current.isAuthenticated).toBe(true);

    // Then set null session
    act(() => {
      result.current.setSession(null);
    });

    expect(result.current.session).toBe(null);
    expect(result.current.user).toBe(null);
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('should set and clear loading state', () => {
    const { result } = renderHook(() => useAuthStore());

    act(() => {
      result.current.setLoading(true);
    });

    expect(result.current.loading).toBe(true);

    act(() => {
      result.current.setLoading(false);
    });

    expect(result.current.loading).toBe(false);
  });

  it('should set and clear error state', () => {
    const { result } = renderHook(() => useAuthStore());

    act(() => {
      result.current.setError('Test error');
    });

    expect(result.current.error).toBe('Test error');

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBe(null);
    expect(result.current.retryCount).toBe(0);
  });

  it('should handle retry count correctly', () => {
    const { result } = renderHook(() => useAuthStore());

    act(() => {
      result.current.incrementRetryCount();
    });

    expect(result.current.retryCount).toBe(1);

    act(() => {
      result.current.incrementRetryCount();
    });

    expect(result.current.retryCount).toBe(2);

    act(() => {
      result.current.resetRetryCount();
    });

    expect(result.current.retryCount).toBe(0);
  });

  it('should reset all state', () => {
    const { result } = renderHook(() => useAuthStore());

    // Set some state
    act(() => {
      result.current.setUser(mockUser);
      result.current.setLoading(true);
      result.current.setError('Test error');
      result.current.incrementRetryCount();
    });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBe('Test error');
    expect(result.current.retryCount).toBe(1);

    // Reset
    act(() => {
      result.current.reset();
    });

    expect(result.current.user).toBe(null);
    expect(result.current.session).toBe(null);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.retryCount).toBe(0);
  });

  it('should update user profile', () => {
    const { result } = renderHook(() => useAuthStore());

    act(() => {
      result.current.setUser(mockUser);
    });

    act(() => {
      result.current.updateUserProfile({
        full_name: 'Updated Name',
        avatar_url: 'https://example.com/new-avatar.jpg',
      });
    });

    expect(result.current.user?.user_metadata?.full_name).toBe('Updated Name');
    expect(result.current.user?.user_metadata?.avatar_url).toBe('https://example.com/new-avatar.jpg');
  });

  it('should not update profile if no user is set', () => {
    const { result } = renderHook(() => useAuthStore());

    act(() => {
      result.current.updateUserProfile({
        full_name: 'Updated Name',
      });
    });

    expect(result.current.user).toBe(null);
  });

  it('should work with selectors', () => {
    const userHook = renderHook(() => useAuthUser());
    const sessionHook = renderHook(() => useAuthSession());
    const isAuthenticatedHook = renderHook(() => useIsAuthenticated());
    const actionsHook = renderHook(() => useAuthActions());

    expect(userHook.result.current).toBe(null);
    expect(sessionHook.result.current).toBe(null);
    expect(isAuthenticatedHook.result.current).toBe(false);

    act(() => {
      actionsHook.result.current.setSession(mockSession);
    });

    userHook.rerender();
    sessionHook.rerender();
    isAuthenticatedHook.rerender();

    expect(userHook.result.current).toEqual(mockUser);
    expect(sessionHook.result.current).toEqual(mockSession);
    expect(isAuthenticatedHook.result.current).toBe(true);
  });
});
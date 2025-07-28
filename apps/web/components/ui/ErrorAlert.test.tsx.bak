import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ErrorAlert } from './ErrorAlert';

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ErrorAlert', () => {
  it('should not render when message is null', () => {
    const { container } = render(<ErrorAlert message={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('should render error message when provided', () => {
    render(<ErrorAlert message="Test error message" />);
    
    expect(screen.getByText('Authentication Error')).toBeInTheDocument();
    expect(screen.getByText('Test error message')).toBeInTheDocument();
  });

  it('should call onDismiss when dismiss button is clicked', () => {
    const onDismiss = vi.fn();
    render(<ErrorAlert message="Test error" onDismiss={onDismiss} />);
    
    const dismissButton = screen.getByRole('button', { name: '' }); // The X button
    fireEvent.click(dismissButton);
    
    // Should call onDismiss after animation delay
    setTimeout(() => {
      expect(onDismiss).toHaveBeenCalled();
    }, 350);
  });

  it('should show retry button when onRetry is provided', () => {
    const onRetry = vi.fn();
    render(<ErrorAlert message="Test error" onRetry={onRetry} />);
    
    const retryButton = screen.getByRole('button', { name: 'Try Again' });
    expect(retryButton).toBeInTheDocument();
    
    fireEvent.click(retryButton);
    expect(onRetry).toHaveBeenCalled();
  });

  it('should not show retry button when onRetry is not provided', () => {
    render(<ErrorAlert message="Test error" />);
    
    expect(screen.queryByRole('button', { name: 'Try Again' })).not.toBeInTheDocument();
  });

  it('should auto-hide after delay when autoHide is true', async () => {
    const onDismiss = vi.fn();
    render(
      <ErrorAlert 
        message="Test error" 
        onDismiss={onDismiss}
        autoHide={true}
        autoHideDelay={100}
      />
    );
    
    // Should be visible initially
    expect(screen.getByText('Test error')).toBeInTheDocument();
    
    // Should auto-hide after delay
    await waitFor(() => {
      expect(onDismiss).toHaveBeenCalled();
    }, { timeout: 500 });
  });

  it('should not auto-hide when autoHide is false', () => {
    const onDismiss = vi.fn();
    render(
      <ErrorAlert 
        message="Test error" 
        onDismiss={onDismiss}
        autoHide={false}
      />
    );
    
    // Should be visible and not auto-dismiss
    expect(screen.getByText('Test error')).toBeInTheDocument();
    
    setTimeout(() => {
      expect(onDismiss).not.toHaveBeenCalled();
    }, 100);
  });

  it('should apply custom className', () => {
    const customClass = 'custom-error-class';
    render(<ErrorAlert message="Test error" className={customClass} />);
    
    // Find the outermost div with the custom class
    const alertContainer = document.querySelector(`.${customClass}`);
    expect(alertContainer).toBeInTheDocument();
    expect(alertContainer).toHaveClass(customClass);
  });

  it('should handle message changes properly', () => {
    const { rerender } = render(<ErrorAlert message="First error" />);
    expect(screen.getByText('First error')).toBeInTheDocument();
    
    rerender(<ErrorAlert message="Second error" />);
    expect(screen.getByText('Second error')).toBeInTheDocument();
    expect(screen.queryByText('First error')).not.toBeInTheDocument();
    
    rerender(<ErrorAlert message={null} />);
    // Component should not render when message is null
    expect(screen.queryByText('Second error')).not.toBeInTheDocument();
  });
});
import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { LivePreview } from '../../LivePreview';
import { useComponentRegistry } from '../useComponentRegistry';
import { useSSEListener } from '../useSSEListener';

// Mock the hooks
jest.mock('../useComponentRegistry');
jest.mock('../useSSEListener');

describe('LivePreview', () => {
  const mockConnect = jest.fn();

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Default mock implementations
    useComponentRegistry.mockReturnValue({
      getComponents: jest.fn().mockReturnValue({}),
    });

    useSSEListener.mockReturnValue({
      isConnected: true,
      connect: mockConnect,
    });
  });

  it('shows empty state with connection status when no components exist', () => {
    render(<LivePreview />);
    
    // Check for empty state message
    expect(screen.getByText('Ready to Generate Components')).toBeInTheDocument();
    expect(screen.getByText('Waiting for component stream to start...')).toBeInTheDocument();
    
    // Check for connection status
    expect(screen.getByText('Connected')).toBeInTheDocument();
  });

  it('shows disconnected state with retry button', () => {
    useSSEListener.mockReturnValue({
      isConnected: false,
      connect: mockConnect,
    });

    render(<LivePreview />);
    
    // Check for disconnected status
    expect(screen.getByText('Disconnected')).toBeInTheDocument();
    
    // Check retry button functionality
    const retryButton = screen.getByText('Retry');
    fireEvent.click(retryButton);
    expect(mockConnect).toHaveBeenCalled();
  });

  it('shows loading states for incomplete components', () => {
    const mockComponents = {
      'loading-component': {
        code: 'const LoadingComponent = () => <div>Loading...</div>;',
        isComplete: false,
      },
      'complete-component': {
        code: 'const CompleteComponent = () => <div>Done</div>;',
        isComplete: true,
      },
    };

    useComponentRegistry.mockReturnValue({
      getComponents: jest.fn().mockReturnValue(mockComponents),
    });

    render(<LivePreview />);
    
    // Check for loading component
    expect(screen.getByText(/Loading component: loading-component/)).toBeInTheDocument();
    
    // Check for component counter
    expect(screen.getByText('2 component(s) loaded')).toBeInTheDocument();
  });

  it('renders components when they exist in the registry', () => {
    const mockComponents = {
      'test-component': {
        code: 'const TestComponent = () => <div>Test Content</div>;',
        isComplete: true,
      },
    };

    useComponentRegistry.mockReturnValue({
      getComponents: jest.fn().mockReturnValue(mockComponents),
    });

    render(<LivePreview />);
    
    expect(screen.getByTestId('preview-container')).toBeInTheDocument();
    expect(screen.getByTestId('live-preview-content')).toBeInTheDocument();
    expect(screen.getByText('1 component(s) loaded')).toBeInTheDocument();
  });

  it('handles component errors with retry button', () => {
    const mockComponents = {
      'error-component': {
        code: 'const InvalidComponent = () => <div>{undefined.property}</div>;',
        isComplete: true,
      },
    };

    useComponentRegistry.mockReturnValue({
      getComponents: jest.fn().mockReturnValue(mockComponents),
    });

    render(<LivePreview />);
    
    // Check for error boundary
    const errorBoundary = screen.getByTestId('error-boundary');
    expect(errorBoundary).toBeInTheDocument();
    
    // Check for retry button in error boundary
    const retryButton = screen.getByText('Try Again');
    expect(retryButton).toBeInTheDocument();
    
    // Test retry functionality
    fireEvent.click(retryButton);
    expect(screen.getByTestId('preview-error')).toBeInTheDocument();
  });

  it('connects to the specified endpoint', () => {
    const customEndpoint = '/api/custom-generate';
    render(<LivePreview endpoint={customEndpoint} />);
    
    expect(useSSEListener).toHaveBeenCalledWith(
      customEndpoint,
      expect.any(Object)
    );
  });

  it('uses default endpoint when none is provided', () => {
    render(<LivePreview />);
    
    expect(useSSEListener).toHaveBeenCalledWith(
      '/api/generate',
      expect.any(Object)
    );
  });

  it('passes the registry to the SSE listener', () => {
    const mockRegistry = {
      getComponents: jest.fn().mockReturnValue({}),
    };
    useComponentRegistry.mockReturnValue(mockRegistry);

    render(<LivePreview />);
    
    expect(useSSEListener).toHaveBeenCalledWith(
      expect.any(String),
      mockRegistry
    );
  });

  it('shows correct loading and complete states for multiple components', () => {
    const mockComponents = {
      'loading-1': { code: 'const Loading1 = () => <div>Loading 1</div>;', isComplete: false },
      'loading-2': { code: 'const Loading2 = () => <div>Loading 2</div>;', isComplete: false },
      'complete-1': { code: 'const Complete1 = () => <div>Complete 1</div>;', isComplete: true },
    };

    useComponentRegistry.mockReturnValue({
      getComponents: jest.fn().mockReturnValue(mockComponents),
    });

    render(<LivePreview />);
    
    // Check for loading components
    expect(screen.getByText(/Loading component: loading-1/)).toBeInTheDocument();
    expect(screen.getByText(/Loading component: loading-2/)).toBeInTheDocument();
    
    // Check component counter
    expect(screen.getByText('3 component(s) loaded')).toBeInTheDocument();
  });
}); 
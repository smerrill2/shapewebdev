import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import LivePreview from '../LivePreview';

// Enhanced mock implementations
jest.mock('react-live', () => ({
  LiveProvider: ({ children }) => (
    <div data-testid="live-provider">
      {children}
    </div>
  ),
  LivePreview: () => <div>Preview Content</div>,
  LiveError: () => <div data-testid="live-error">Error</div>
}));

// Mock UI components with proper test IDs
jest.mock('../ui', () => ({
  Button: () => <button data-testid="mock-button">Button</button>,
  Input: () => <input data-testid="mock-input" />,
  // Add other UI components as needed
}));

// Mock icons with test IDs
jest.mock('@heroicons/react/24/outline', () => ({
  ChevronLeft: () => <svg data-testid="chevron-left-icon" />,
  ChevronRight: () => <svg data-testid="chevron-right-icon" />
}));

jest.mock('@heroicons/react/24/solid', () => ({
  ChevronLeft: () => <svg data-testid="solid-chevron-left-icon" />,
  ChevronRight: () => <svg data-testid="solid-chevron-right-icon" />
}));

class MockEventSource {
  constructor() {
    this.listeners = {};
  }

  addEventListener(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  removeEventListener(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }

  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => {
        if (event === 'message') {
          callback({ data: JSON.stringify(data) });
        } else {
          callback(data);
        }
      });
    }
  }
}

describe('LivePreview Component', () => {
  let mockStream;

  beforeEach(() => {
    jest.useFakeTimers();
    mockStream = new MockEventSource();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  test('renders without crashing', () => {
    render(<LivePreview />);
    expect(screen.getByTestId('live-provider')).toBeInTheDocument();
  });

  test('handles initial connection message', async () => {
    render(<LivePreview stream={mockStream} />);

    await act(async () => {
      mockStream.emit('message', {
        type: 'connection',
        metadata: { clientId: 'test-client' }
      });
      jest.advanceTimersByTime(100);
    });

    expect(screen.getByTestId('live-provider')).toBeInTheDocument();
  });

  test('processes import statements correctly', async () => {
    render(<LivePreview stream={mockStream} />);

    await act(async () => {
      mockStream.emit('message', {
        type: 'jsx_chunk',
        metadata: { 
          isImport: true,
          scope: { 
            TestComponent: () => <div data-testid="test-component">Test</div>
          }
        }
      });
      jest.advanceTimersByTime(100);
    });

    expect(screen.getByTestId('live-provider')).toBeInTheDocument();
  });

  test('handles complete component chunks', async () => {
    render(<LivePreview stream={mockStream} />);

    await act(async () => {
      mockStream.emit('message', {
        type: 'jsx_chunk',
        metadata: {
          componentName: 'TestComponent',
          code: 'const TestComponent = () => <div>Test</div>;',
          isComplete: true
        }
      });
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(screen.getByTestId('component-wrapper-TestComponent')).toBeInTheDocument();
      expect(screen.getByTestId('live-preview-TestComponent')).toBeInTheDocument();
    });
  });

  test('handles stream errors gracefully', async () => {
    render(<LivePreview stream={mockStream} />);

    await act(async () => {
      mockStream.emit('error', new Error('Test error'));
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('Test error');
    });
  });

  test('renders error boundary for invalid components', async () => {
    render(<LivePreview stream={mockStream} />);

    await act(async () => {
      mockStream.emit('message', {
        type: 'jsx_chunk',
        code: 'throw new Error("Invalid component");',
        metadata: {
          componentName: 'InvalidComponent',
          isComplete: true
        }
      });
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(screen.getByText('Component Error')).toBeInTheDocument();
      expect(screen.getByText('Invalid component')).toBeInTheDocument();
    });
  });

  test('cleans up event listeners on unmount', () => {
    const { unmount } = render(<LivePreview stream={mockStream} />);
    unmount();
    expect(mockStream.removeEventListener).toHaveBeenCalledTimes(2);
  });

  test('handles multiple component chunks', async () => {
    render(<LivePreview stream={mockStream} />);

    await act(async () => {
      mockStream.emit('message', {
        type: 'jsx_chunk',
        code: 'const Component1 = () => <div>Component 1</div>;',
        metadata: {
          componentName: 'Component1',
          isComplete: false
        }
      });

      mockStream.emit('message', {
        type: 'jsx_chunk',
        code: 'export default Component1;',
        metadata: {
          componentName: 'Component1',
          isComplete: true
        }
      });
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(screen.getByTestId('component-wrapper-Component1')).toBeInTheDocument();
      expect(screen.getByText('Component 1')).toBeInTheDocument();
    });
  });

  test('handles component relationships', async () => {
    render(<LivePreview stream={mockStream} />);

    await act(async () => {
      mockStream.emit('message', {
        type: 'jsx_chunk',
        code: `
          const Parent = () => <Child />;
          export default Parent;
        `,
        metadata: {
          componentName: 'Parent',
          isComplete: true,
          childComponents: ['Child']
        }
      });

      mockStream.emit('message', {
        type: 'jsx_chunk',
        code: `
          const Child = () => <div>Child Component</div>;
          export default Child;
        `,
        metadata: {
          componentName: 'Child',
          isComplete: true,
          parentComponent: 'Parent'
        }
      });
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(screen.getByTestId('component-wrapper-Parent')).toBeInTheDocument();
      expect(screen.getByText('Child Component')).toBeInTheDocument();
    });
  });
});

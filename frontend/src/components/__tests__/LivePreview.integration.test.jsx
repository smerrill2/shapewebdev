import React from 'react';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import LivePreview from '../LivePreview';
import '@testing-library/jest-dom';

// Memory tracking utilities
const getMemoryUsage = () => {
  const used = process.memoryUsage();
  return {
    rss: Math.round(used.rss / 1024 / 1024),
    heapTotal: Math.round(used.heapTotal / 1024 / 1024),
    heapUsed: Math.round(used.heapUsed / 1024 / 1024),
    external: Math.round(used.external / 1024 / 1024),
  };
};

const forceGarbageCollection = () => {
  if (global.gc) {
    global.gc();
  }
};

describe('LivePreview Integration Tests', () => {
  let mockStream;
  let mockComponent;
  let initialMemory;

  beforeAll(() => {
    // Create shared mock instances
    mockStream = {
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      close: jest.fn(),
    };

    mockComponent = {
      type: 'jsx_chunk',
      code: `function TestComponent() { return <div data-testid="test-component">Test</div>; }`,
      metadata: {
        componentName: 'TestComponent'
      }
    };
  });

  beforeEach(() => {
    jest.clearAllMocks();
    initialMemory = getMemoryUsage();
    console.log('Initial memory:', initialMemory);
  });

  afterEach(() => {
    // Clean up DOM after each test
    cleanup();
    
    // Force garbage collection
    forceGarbageCollection();
    
    // Verify memory cleanup
    const finalMemory = getMemoryUsage();
    console.log('Final memory:', finalMemory);
    
    if (finalMemory.heapUsed > initialMemory.heapUsed * 1.5) {
      console.warn('Potential memory leak detected');
    }
  });

  test('renders received component from stream', async () => {
    const { unmount } = render(<LivePreview stream={mockStream} />);

    // Simulate receiving a component chunk
    const messageEvent = new MessageEvent('message', {
      data: JSON.stringify(mockComponent)
    });
    mockStream.addEventListener.mock.calls[0][1](messageEvent);

    await waitFor(() => {
      expect(screen.getByTestId('test-component')).toBeInTheDocument();
      expect(screen.getByText('Test')).toBeVisible();
    });

    // Clean up component
    unmount();
  });

  test('handles component errors with ErrorBoundary', async () => {
    const errorComponent = {
      type: 'jsx_chunk',
      code: `function ErrorComponent() { throw new Error('Test error'); }`,
      metadata: {
        componentName: 'ErrorComponent'
      }
    };

    const { unmount } = render(<LivePreview stream={mockStream} />);

    // Simulate receiving an error-prone component
    const messageEvent = new MessageEvent('message', {
      data: JSON.stringify(errorComponent)
    });
    mockStream.addEventListener.mock.calls[0][1](messageEvent);

    await waitFor(() => {
      expect(screen.getByText('Component Error')).toBeInTheDocument();
      expect(screen.getByText('Test error')).toBeVisible();
    });

    // Clean up component
    unmount();
  });

  test('handles stream errors', async () => {
    const { unmount } = render(<LivePreview stream={mockStream} />);

    // Simulate stream error
    const errorEvent = new ErrorEvent('error', {
      message: 'Stream error'
    });
    mockStream.addEventListener.mock.calls[1][1](errorEvent);

    await waitFor(() => {
      expect(screen.getByText('Stream connection error')).toBeInTheDocument();
    });

    // Clean up component
    unmount();
  });

  test('handles malformed messages', async () => {
    const { unmount } = render(<LivePreview stream={mockStream} />);

    // Simulate malformed message
    const messageEvent = new MessageEvent('message', {
      data: 'invalid-json'
    });
    mockStream.addEventListener.mock.calls[0][1](messageEvent);

    await waitFor(() => {
      expect(screen.getByText(/Message parsing error/)).toBeInTheDocument();
    });

    // Clean up component
    unmount();
  });
});

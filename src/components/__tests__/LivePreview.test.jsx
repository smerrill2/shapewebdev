import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SimpleLivePreview } from '../SimpleLivePreview';
import { LivePreviewTestPage } from '../LivePreviewTestPage';
import { cleanCodeForLive } from '../utils/babelTransformations';
import { TextEncoder, TextDecoder } from 'util';

// Mock react-live
jest.mock('react-live', () => ({
  LiveProvider: ({ children }) => children,
  LivePreview: ({ children }) => <div data-testid="live-preview">{children}</div>,
  LiveError: ({ children }) => <div data-testid="live-error">{children}</div>
}));

// Mock UI components
jest.mock('../ui', () => ({
  Button: ({ children }) => <button>{children}</button>,
  Card: ({ children }) => <div className="card">{children}</div>
}));

// Mock window.addEventListener for stream_delta events
const mockStreamDeltaListeners = new Set();
global.addEventListener = (event, callback) => {
  if (event === 'stream_delta') {
    mockStreamDeltaListeners.add(callback);
  }
};
global.removeEventListener = (event, callback) => {
  if (event === 'stream_delta') {
    mockStreamDeltaListeners.delete(callback);
  }
};

// Helper to dispatch stream delta events
const dispatchStreamDelta = (detail) => {
  mockStreamDeltaListeners.forEach(listener => {
    listener({ detail });
  });
};

describe('LivePreview Tests', () => {
  beforeEach(() => {
    // Mock fetch before each test
    global.fetch = jest.fn();
    jest.clearAllMocks();
    mockStreamDeltaListeners.clear();
  });

  afterEach(() => {
    // Clean up after each test
    jest.resetAllMocks();
  });

  describe('SimpleLivePreview Component Tests', () => {
    it('should render initial state correctly', () => {
      const registry = {};
      render(<SimpleLivePreview registry={registry} />);
      
      expect(screen.getByText('Ready to generate components')).toBeInTheDocument();
    });

    it('should handle streaming state and show loading indicator', () => {
      const registry = { components: new Map() };
      const streamingStates = new Map([['test-component', { isStreaming: true }]]);
      render(
        <SimpleLivePreview 
          registry={registry} 
          streamingStates={streamingStates}
        />
      );
      
      expect(screen.getByText('Generating components...')).toBeInTheDocument();
    });

    it('should handle component code buffering correctly', async () => {
      const registry = { components: new Map() };
      render(<SimpleLivePreview registry={registry} />);

      // Simulate streaming component code
      dispatchStreamDelta({
        type: 'content_block_delta',
        metadata: { componentId: 'test-component' },
        delta: { text: 'function TestComponent() { return <div>Test</div>; }' }
      });

      dispatchStreamDelta({
        type: 'content_block_stop',
        metadata: { componentId: 'test-component' }
      });

      await waitFor(() => {
        expect(screen.getByTestId('preview-container')).toBeInTheDocument();
      });
    });

    it('should handle errors in component rendering', () => {
      const registry = { components: new Map() };
      const streamingStates = new Map([['test-component', { isStreaming: false, error: 'Invalid code' }]]);
      render(
        <SimpleLivePreview 
          registry={registry} 
          streamingStates={streamingStates}
        />
      );
      
      expect(screen.getByTestId('preview-error')).toBeInTheDocument();
    });
  });

  describe('End-to-End Integration Tests', () => {
    it('should transform and render a simple button component', async () => {
      const SSEdata = [
        'data: {"type":"component","content":"function Button() { return <button>Test</button>; }"}\n\n',
        'data: [DONE]\n\n'
      ];

      global.fetch.mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'text/event-stream' }),
        body: {
          getReader: () => ({
            read: async () => {
              const data = SSEdata.shift();
              return data ? { value: new TextEncoder().encode(data), done: false } : { done: true };
            }
          })
        }
      });

      render(<LivePreviewTestPage />);
      fireEvent.click(screen.getByText('Generate'));

      await waitFor(() => {
        expect(screen.getByTestId('preview-container')).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('should handle a compound component with dependencies', async () => {
      const SSEdata = [
        'data: {"type":"component","content":"function Navigation() { return <nav><button>Test</button></nav>; }"}\n\n',
        'data: [DONE]\n\n'
      ];

      global.fetch.mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'text/event-stream' }),
        body: {
          getReader: () => ({
            read: async () => {
              const data = SSEdata.shift();
              return data ? { value: new TextEncoder().encode(data), done: false } : { done: true };
            }
          })
        }
      });

      render(<LivePreviewTestPage />);
      fireEvent.click(screen.getByText('Generate'));

      await waitFor(() => {
        expect(screen.getByTestId('preview-container')).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('should handle errors in SSE data gracefully', async () => {
      const SSEdata = [
        'data: {"type":"error","content":"Invalid component code"}\n\n',
        'data: [DONE]\n\n'
      ];

      global.fetch.mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'text/event-stream' }),
        body: {
          getReader: () => ({
            read: async () => {
              const data = SSEdata.shift();
              return data ? { value: new TextEncoder().encode(data), done: false } : { done: true };
            }
          })
        }
      });

      render(<LivePreviewTestPage />);
      fireEvent.click(screen.getByText('Generate'));

      await waitFor(() => {
        expect(screen.getByTestId('preview-error')).toBeInTheDocument();
      }, { timeout: 2000 });
    });
  });

  describe('Code Transformation Tests', () => {
    it('should properly transform component code', () => {
      const inputCode = 'function Button() { return <button>Test</button>; }';
      const transformedCode = cleanCodeForLive(inputCode);
      
      expect(transformedCode).toContain('React.createElement');
      expect(transformedCode).toContain('button');
      expect(transformedCode).toContain('Test');
    });

    it('should properly transform code through the Babel pipeline', () => {
      const inputCode = `
        function TestComponent() {
          return (
            <div className="p-4 bg-white">
              <h1 className="text-xl">Hello</h1>
              {items.map(item => (
                <div key={item.id}>{item.name}</div>
              ))}
            </div>
          );
        }
      `;
      
      const transformedCode = cleanCodeForLive(inputCode);
      
      expect(transformedCode).toContain('React.createElement');
      expect(transformedCode).toContain('className');
      expect(transformedCode).toContain('p-4 bg-white');
    });
  });
}); 
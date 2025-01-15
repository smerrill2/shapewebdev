import React from 'react';
import { render, screen, act, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ReadableStream } from 'stream/web';
import GeneratePage from '../pages/GeneratePage';
import userEvent from '@testing-library/user-event';
import { TextDecoder } from 'util';

// Mock the fetch API
global.fetch = jest.fn();

// Mock ReadableStream
global.ReadableStream = ReadableStream;

// Add TextEncoder polyfill for tests
if (typeof TextEncoder === 'undefined') {
  global.TextEncoder = function TextEncoder() {
    return {
      encode: function(str) {
        const arr = new Uint8Array(str.length);
        for (let i = 0; i < str.length; i++) {
          arr[i] = str.charCodeAt(i);
        }
        return arr;
      }
    };
  };
}

// Mock LivePreview component
jest.mock('../components/LivePreview', () => {
  return {
    __esModule: true,
    default: ({ componentList = [] }) => (
      <div>
        {componentList.map((c, i) => {
          if (c.error) {
            return <div key={i} data-testid="preview-error">Failed to evaluate component</div>;
          }
          // Get component name from either code or name property
          const name = c.name || (c.code && c.code.match(/function (\w+)/)?.[1]);
          if (!name) {
            console.error('Component missing name:', c);
            return null;
          }
          return <div key={i} data-testid={`preview-${name}`}>{name} Component</div>;
        })}
      </div>
    )
  };
});

// Mock stream data for testing
const mockStreamData = [
  {
    type: 'content_block_delta',
    delta: {
      name: 'Header',
      code: `export default function Header() {
        return (
          <div data-testid="preview-Header">Header Component</div>
        );
      }`,
      content: '<div data-testid="preview-Header">Header Component</div>',
      streamedCode: '<div data-testid="preview-Header">Header Component</div>',
      error: null
    },
    metadata: {
      isComponent: true,
      isComplete: true,
      type: 'component'
    }
  },
  {
    type: 'content_block_delta',
    delta: {
      name: 'Footer',
      code: `export default function Footer() {
        return (
          <div data-testid="preview-Footer">Footer Component</div>
        );
      }`,
      content: '<div data-testid="preview-Footer">Footer Component</div>',
      streamedCode: '<div data-testid="preview-Footer">Footer Component</div>',
      error: null
    },
    metadata: {
      isComponent: true,
      isComplete: true,
      type: 'component'
    }
  },
  {
    type: 'message_stop'
  }
];

// Mock stream generator helper
const mockStreamGenerator = (messages) => {
  let messageIndex = 0;
  
  return new ReadableStream({
    async pull(controller) {
      if (messageIndex < messages.length) {
        const message = messages[messageIndex++];
        const data = `data: ${JSON.stringify(message)}\n\n`;
        const encoder = new TextEncoder();
        controller.enqueue(encoder.encode(data));
        
        if (messageIndex === messages.length) {
          controller.close();
        }
      } else {
        controller.close();
      }
    }
  });
};

// Mock error data with proper format
const mockErrorData = [
  { 
    type: 'content_block_delta', 
    delta: { 
      text: 'Starting component generation...',
      content: 'Starting component generation...',
      type: 'thought'
    }, 
    metadata: { 
      isComponent: false,
      type: 'thought'
    } 
  },
  { 
    type: 'content_block_delta', 
    delta: { 
      text: 'const InvalidComponent = () => { throw new Error("Failed to evaluate component"); }',
      name: 'InvalidComponent',
      error: 'Failed to evaluate component'
    }, 
    metadata: { 
      isComponent: true, 
      componentName: 'InvalidComponent',
      error: 'Failed to evaluate component',
      isComplete: true 
    } 
  }
];

// Add TextDecoder polyfill for tests
global.TextDecoder = TextDecoder;

describe('GeneratePage Integration Tests', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    global.fetch.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('completes the generation flow successfully', async () => {
    // Mock fetch to return a successful stream
    global.fetch.mockImplementation(() => Promise.resolve({
      ok: true,
      headers: new Headers({
        'Content-Type': 'text/event-stream'
      }),
      body: mockStreamGenerator([
        {
          type: 'content_block_delta',
          delta: {
            name: 'Header',
            code: `export default function Header() {
              return (
                <div data-testid="preview-Header">Header Component</div>
              );
            }`,
            content: '<div data-testid="preview-Header">Header Component</div>',
            error: null,
            streamedCode: '<div data-testid="preview-Header">Header Component</div>'
          },
          metadata: {
            isComponent: true,
            isComplete: true,
            type: 'component'
          }
        },
        {
          type: 'content_block_delta',
          delta: {
            name: 'Footer',
            code: `export default function Footer() {
              return (
                <div data-testid="preview-Footer">Footer Component</div>
              );
            }`,
            content: '<div data-testid="preview-Footer">Footer Component</div>',
            error: null,
            streamedCode: '<div data-testid="preview-Footer">Footer Component</div>'
          },
          metadata: {
            isComponent: true,
            isComplete: true,
            type: 'component'
          }
        },
        {
          type: 'message_stop'
        }
      ])
    }));

    await act(async () => {
      render(<GeneratePage />);
    });
    
    const promptInput = screen.getByPlaceholderText('Tell us about your business...');
    await act(async () => {
      await userEvent.type(promptInput, 'modern and professional');
    });

    const generateButton = screen.getByTestId('generate-button');
    await act(async () => {
      await userEvent.click(generateButton);
    });

    // Advance timers to process stream messages
    await act(async () => {
      jest.advanceTimersByTime(50); // First message
      jest.advanceTimersByTime(50); // Second message
      jest.advanceTimersByTime(50); // Stop message
    });

    // Check for completed components
    await waitFor(() => {
      expect(screen.getByTestId('preview-Header')).toBeInTheDocument();
      expect(screen.getByTestId('preview-Footer')).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it('handles component evaluation errors', async () => {
    global.fetch.mockImplementation(() => 
      Promise.resolve({
        ok: true,
        body: mockStreamGenerator(mockErrorData)
      })
    );

    await act(async () => {
      render(<GeneratePage />);
    });
    
    // Fill out form
    const promptInput = screen.getByTestId('prompt-input');
    await act(async () => {
      await userEvent.type(promptInput, 'Test business description');
    });

    const generateButton = screen.getByRole('button', { name: /Generate Website/i });
    await act(async () => {
      await userEvent.click(generateButton);
    });

    // Check for error display
    await waitFor(() => {
      const errorElement = screen.getByTestId('preview-error');
      expect(errorElement).toBeInTheDocument();
      expect(errorElement).toHaveTextContent('Failed to evaluate component');
    });
  });

  it('handles stream errors', async () => {
    // Mock fetch to simulate a network error
    global.fetch.mockImplementation(() => Promise.reject(new Error('Network error')));

    await act(async () => {
      render(<GeneratePage />);
    });
    
    const promptInput = screen.getByTestId('prompt-input');
    const generateButton = screen.getByRole('button', { name: /Generate Website/i });

    await act(async () => {
      await userEvent.type(promptInput, 'error case');
      await userEvent.click(generateButton);
    });

    // Wait for error message
    await waitFor(() => {
      const statusElement = screen.getByTestId('stream-status');
      expect(statusElement).toHaveClass('flex', 'text-red-400');
      expect(statusElement).toHaveTextContent('error');
      expect(statusElement).not.toHaveClass('text-amber-400', 'text-green-400');
    }, { timeout: 1000 });
  });

  it('handles stream reconnection', async () => {
    // Mock fetch implementation for reconnection
    global.fetch.mockImplementationOnce(() => {
      throw new Error('Network error');
    }).mockImplementationOnce(() => {
      return Promise.resolve({
        ok: true,
        status: 200,
        headers: new Headers({
          'content-type': 'text/event-stream'
        }),
        body: mockStreamGenerator(mockStreamData)
      });
    });

    // Render component and submit form
    render(<GeneratePage />);
    const generateButton = screen.getByTestId('generate-button');
    const promptInput = screen.getByPlaceholderText('Tell us about your business...');

    await act(async () => {
      fireEvent.change(promptInput, { target: { value: 'test prompt' } });
      fireEvent.click(generateButton);
    });

    // Wait for error state
    await waitFor(() => {
      const statusElement = screen.getByTestId('stream-status');
      expect(statusElement).toHaveClass('text-red-400');
      expect(statusElement).toHaveTextContent('error');
    });

    // Wait for first delay (50ms) before reconnection attempt
    await act(async () => {
      jest.advanceTimersByTime(50);
    });

    // Wait for connecting state
    await waitFor(() => {
      const statusElement = screen.getByTestId('stream-status');
      expect(statusElement).toHaveClass('text-amber-400');
      expect(statusElement).toHaveTextContent('connecting');
    });

    // Wait for second delay (50ms) and process messages
    await act(async () => {
      jest.advanceTimersByTime(50);
      jest.advanceTimersByTime(10); // First message
      jest.advanceTimersByTime(10); // Second message
      jest.advanceTimersByTime(10); // Stop message
    });

    // Wait for streaming state and components
    await waitFor(() => {
      const statusElement = screen.getByTestId('stream-status');
      expect(statusElement).toHaveClass('text-green-400');
      expect(statusElement).toHaveTextContent('streaming');
      expect(screen.getByTestId('preview-Header')).toBeInTheDocument();
      expect(screen.getByTestId('preview-Footer')).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it('handles component state transitions correctly', async () => {
    // Mock the fetch response for generation
    global.fetch = jest.fn().mockImplementation(() => {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          // First component
          controller.enqueue(encoder.encode('data: {"type":"content_block_delta","delta":{"name":"Button","code":"const Button = () => <button>Click</button>","content":"<button>Click</button>","error":null},"metadata":{"isComponent":true,"isComplete":true,"type":"component"}}\n\n'));
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Second component
          controller.enqueue(encoder.encode('data: {"type":"content_block_delta","delta":{"name":"Header","code":"const Header = () => <header><Button /></header>","content":"<header><Button /></header>","error":null},"metadata":{"isComponent":true,"isComplete":true,"type":"component"}}\n\n'));
          await new Promise(resolve => setTimeout(resolve, 100));
          
          controller.enqueue(encoder.encode('data: {"type":"message_stop"}\n\n'));
          controller.close();
        }
      });
      return Promise.resolve({
        ok: true,
        headers: new Headers({
          'Content-Type': 'text/event-stream'
        }),
        body: stream,
      });
    });

    await act(async () => {
      render(<GeneratePage />);
    });

    // Fill in required fields
    const promptInput = screen.getByTestId('prompt-input');
    await act(async () => {
      fireEvent.change(promptInput, { target: { value: 'Test business' } });
    });

    // Click generate button
    const generateButton = screen.getByRole('button', { name: /generate/i });
    await act(async () => {
      fireEvent.click(generateButton);
    });

    // Verify initial component state
    await waitFor(() => {
      expect(screen.getByTestId('preview-Button')).toHaveTextContent('Button Component');
    }, { timeout: 2000 });

    // Verify transition to second component
    await waitFor(() => {
      expect(screen.getByTestId('preview-Header')).toHaveTextContent('Header Component');
    }, { timeout: 2000 });

    // Verify final state shows both components
    await waitFor(() => {
      expect(screen.getByTestId('preview-Button')).toHaveTextContent('Button Component');
      expect(screen.getByTestId('preview-Header')).toHaveTextContent('Header Component');
    }, { timeout: 2000 });
  });
}); 
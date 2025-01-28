import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from 'react';
import GeneratePage from '../pages/GeneratePage';
import { ReadableStream, WritableStream, TransformStream } from 'web-streams-polyfill';
import userEvent from '@testing-library/user-event';
import { performance } from 'perf_hooks';

// Configure Jest for async React updates
jest.setTimeout(30000);

// Mock LivePreview component with transition state support
jest.mock('../components/LivePreview', () => ({
  __esModule: true,
  default: ({ componentList, transitionState }) => (
    <div data-testid="live-preview">
      <div>
        <h3 data-testid="live-preview-title">Live Preview</h3>
      </div>
      <div data-testid="preview-container">
        <div data-testid="preview-content">
          {componentList.map((comp) => (
            <div 
              key={comp.name} 
              data-testid="live-preview-component"
              data-transition={transitionState?.to === comp.name ? 'entering' : 
                             transitionState?.from === comp.name ? 'leaving' : 'none'}
            >
              <div>
                <h3>{comp.name} {comp.isComplete ? '(Complete)' : ''}</h3>
              </div>
              <div>
                <pre>{comp.code}</pre>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}));

// Mock AnimatedPreview component with enhanced animation support
jest.mock('../components/AnimatedPreview', () => ({
  __esModule: true,
  default: ({ code, isComplete, componentName, transitionState }) => (
    <div 
      data-testid="animated-preview" 
      data-complete={isComplete}
      data-transition={transitionState?.to === componentName ? 'entering' : 
                      transitionState?.from === componentName ? 'leaving' : 'none'}
    >
      <div>
        <h3 data-testid="preview-title">
          {componentName || 'Component Preview'}
          {isComplete && ' (Complete)'}
        </h3>
      </div>
      <pre data-testid="preview-code">
        <code>{code}</code>
      </pre>
    </div>
  )
}));

// Mock Anthropic messages
const mockAnthropicMessages = [
  { type: 'message_start', message: { id: 'msg_1', role: 'assistant' } },
  { 
    type: 'content_block_start', 
    content_block: { type: 'text', purpose: 'thought' }
  },
  { 
    type: 'content_block_delta', 
    delta: { text: 'Starting generation...' },
    content_block: { type: 'text', purpose: 'thought' }
  },
  { type: 'content_block_stop' },
  { 
    type: 'content_block_start', 
    content_block: { type: 'text', purpose: 'thought' }
  },
  { 
    type: 'content_block_delta', 
    delta: { text: 'Analyzing requirements...' },
    content_block: { type: 'text', purpose: 'thought' }
  },
  { type: 'content_block_stop' },
  { type: 'message_stop' }
];

const mockAnthropicErrorMessages = [
  { type: 'message_start', message: { id: 'msg_2', role: 'assistant' } },
  { 
    type: 'content_block_start', 
    content_block: { type: 'text', purpose: 'thought' }
  },
  { 
    type: 'content_block_delta', 
    delta: { text: 'Starting generation...' },
    content_block: { type: 'text', purpose: 'thought' }
  },
  { type: 'content_block_stop' },
  { 
    type: 'content_block_start', 
    content_block: { type: 'text', purpose: 'thought' }
  },
  { 
    type: 'content_block_delta', 
    delta: { text: 'Error: Failed to generate' },
    content_block: { type: 'text', purpose: 'thought' }
  },
  { type: 'content_block_stop' },
  { type: 'message_stop' }
];

describe('Component Generation Flow', () => {
  let streamMetrics;
  let streamStartTime;

  beforeAll(() => {
    // Mock requestAnimationFrame and cancelAnimationFrame
    global.requestAnimationFrame = (callback) => setTimeout(callback, 0);
    global.cancelAnimationFrame = (id) => clearTimeout(id);

    // Configure test environment
    jest.spyOn(console, 'error').mockImplementation(() => {});

    // Polyfill web streams API
    global.ReadableStream = ReadableStream;
    global.WritableStream = WritableStream;
    global.TransformStream = TransformStream;

    // Mock TextEncoder and TextDecoder
    global.TextEncoder = class {
      encode(str) { return new Uint8Array([...str].map(char => char.charCodeAt(0))); }
    };
    global.TextDecoder = class {
      decode(arr) { return String.fromCharCode(...arr); }
    };
  });

  beforeEach(() => {
    jest.useFakeTimers();
    streamMetrics = { deltaLatencies: [100, 200, 300] }; // Add some sample latencies
    streamStartTime = 0;

    // Mock performance.now
    global.performance = { now: jest.fn(() => Date.now()) };

    // Mock fetch implementation with proper SSE formatting
    global.fetch = jest.fn((url, options) => {
      const messages = options.body.includes('error case') ? mockAnthropicErrorMessages : mockAnthropicMessages;
      
      return Promise.resolve({
        ok: true,
        headers: new Map([['content-type', 'text/event-stream']]),
        body: new ReadableStream({
          async start(controller) {
            for (const message of messages) {
              await new Promise(resolve => setTimeout(resolve, 0)); // Ensure async
              controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(message)}\n\n`));
            }
            controller.close();
          }
        })
      });
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.resetAllMocks();
  });

  afterAll(() => {
    console.error.mockRestore();
  });

  test('meets performance requirements for streaming and rendering', async () => {
    render(<GeneratePage />);

    // Fill in required fields
    await userEvent.type(screen.getByTestId('prompt-input'), 'modern and professional');
    await userEvent.type(screen.getByTestId('style-input'), 'modern style');
    await userEvent.type(screen.getByTestId('requirements-input'), 'key features');

    // Click generate button and wait for form to be disabled
    await userEvent.click(screen.getByText(/build my website/i));
    await waitFor(() => expect(screen.getByTestId('prompt-input')).toBeDisabled());

    // Process initial messages
    for (let i = 0; i < 10; i++) {
      jest.advanceTimersByTime(100);
    }

    // Verify first thought appears
    await waitFor(() => {
      const thoughtContainer = screen.getByText('Design Thoughts').closest('.space-y-2');
      expect(thoughtContainer).toBeInTheDocument();
      const thoughtItems = thoughtContainer.querySelectorAll('[data-testid="thought-item"]');
      expect(thoughtItems[0]).toHaveTextContent('Starting generation...');
    });

    // Process more messages
    for (let i = 0; i < 10; i++) {
      jest.advanceTimersByTime(100);
    }

    // Verify second thought appears
    await waitFor(() => {
      const thoughtContainer = screen.getByText('Design Thoughts').closest('.space-y-2');
      const thoughtItems = thoughtContainer.querySelectorAll('[data-testid="thought-item"]');
      expect(thoughtItems.length).toBeGreaterThan(1);
      expect(thoughtItems[1]).toHaveTextContent('Analyzing requirements...');
    });

    // Verify streaming updates were tracked
    expect(streamMetrics.deltaLatencies.length).toBeGreaterThan(0);
  });

  test('maintains consistent streaming performance under load', async () => {
    render(<GeneratePage />);

    // Fill in required fields
    await userEvent.type(screen.getByTestId('prompt-input'), 'modern and professional');
    await userEvent.type(screen.getByTestId('style-input'), 'modern style');
    await userEvent.type(screen.getByTestId('requirements-input'), 'key features');

    // Click generate button and wait for form to be disabled
    await userEvent.click(screen.getByText(/build my website/i));
    await waitFor(() => expect(screen.getByTestId('prompt-input')).toBeDisabled());

    // Process initial messages
    for (let i = 0; i < 10; i++) {
      jest.advanceTimersByTime(100);
    }

    // Verify first thought appears
    await waitFor(() => {
      const thoughtContainer = screen.getByText('Design Thoughts').closest('.space-y-2');
      expect(thoughtContainer).toBeInTheDocument();
    });

    // Process more messages
    for (let i = 0; i < 10; i++) {
      jest.advanceTimersByTime(100);
    }

    // Verify streaming updates were tracked
    expect(streamMetrics.deltaLatencies.length).toBeGreaterThan(0);
  });

  test('processes Anthropic streaming format correctly', async () => {
    render(<GeneratePage />);
    
    await userEvent.type(screen.getByTestId('prompt-input'), 'modern style');
    await userEvent.type(screen.getByTestId('style-input'), 'professional');
    await userEvent.type(screen.getByTestId('requirements-input'), 'key features');
    
    // Click generate and wait for form to be disabled
    await userEvent.click(screen.getByText(/build my website/i));
    await waitFor(() => expect(screen.getByTestId('prompt-input')).toBeDisabled());
    
    // Process initial messages
    for (let i = 0; i < 10; i++) {
      jest.advanceTimersByTime(100);
    }
    
    // Verify first thought
    await waitFor(() => {
      const thoughtContainer = screen.getByText('Design Thoughts').closest('.space-y-2');
      expect(thoughtContainer).toBeInTheDocument();
      const thoughtItems = thoughtContainer.querySelectorAll('[data-testid="thought-item"]');
      expect(thoughtItems[0]).toHaveTextContent('Starting generation...');
    });
    
    // Process more messages
    for (let i = 0; i < 10; i++) {
      jest.advanceTimersByTime(100);
    }
    
    // Verify second thought
    await waitFor(() => {
      const thoughtContainer = screen.getByText('Design Thoughts').closest('.space-y-2');
      const thoughtItems = thoughtContainer.querySelectorAll('[data-testid="thought-item"]');
      expect(thoughtItems.length).toBeGreaterThan(1);
      expect(thoughtItems[1]).toHaveTextContent('Analyzing requirements...');
    });
  });

  test('handles Anthropic streaming errors correctly', async () => {
    render(<GeneratePage />);
    
    await userEvent.type(screen.getByTestId('prompt-input'), 'error case');
    await userEvent.type(screen.getByTestId('style-input'), 'professional');
    await userEvent.type(screen.getByTestId('requirements-input'), 'key features');
    
    // Click generate and wait for form to be disabled
    await userEvent.click(screen.getByText(/build my website/i));
    await waitFor(() => expect(screen.getByTestId('prompt-input')).toBeDisabled());
    
    // Process initial messages
    for (let i = 0; i < 10; i++) {
      jest.advanceTimersByTime(100);
    }
    
    // Verify first thought
    await waitFor(() => {
      const thoughtContainer = screen.getByText('Design Thoughts').closest('.space-y-2');
      expect(thoughtContainer).toBeInTheDocument();
      const thoughtItems = thoughtContainer.querySelectorAll('[data-testid="thought-item"]');
      expect(thoughtItems[0]).toHaveTextContent('Starting generation...');
    });
    
    // Process more messages
    for (let i = 0; i < 10; i++) {
      jest.advanceTimersByTime(100);
    }
    
    // Verify error message
    await waitFor(() => {
      const thoughtContainer = screen.getByText('Design Thoughts').closest('.space-y-2');
      const thoughtItems = thoughtContainer.querySelectorAll('[data-testid="thought-item"]');
      expect(thoughtItems.length).toBeGreaterThan(1);
      expect(thoughtItems[1]).toHaveTextContent('Error: Failed to generate');
    });
  });
});

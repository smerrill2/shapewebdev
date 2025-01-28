const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

const { EventEmitter } = require('events');
const { Readable } = require('stream');

// Mock the Anthropic SDK before requiring aiClient
const mockCreate = jest.fn();
jest.mock('@anthropic-ai/sdk', () => ({
  Anthropic: jest.fn().mockImplementation(() => ({
    messages: {
      create: mockCreate
    }
  }))
}));

// Now require aiClient after mocking
const { generate } = require('../aiClient');

class MockEventStream extends EventEmitter {
  constructor(events) {
    super();
    this.events = events;
    this.destroyed = false;
  }

  start() {
    if (this.destroyed) return;
    
    // Process events synchronously
    process.nextTick(() => {
      for (const event of this.events) {
        if (this.destroyed) break;
        // Format as SSE
        this.emit('data', Buffer.from(`data: ${JSON.stringify(event)}\n\n`));
      }
      
      if (!this.destroyed) {
        this.emit('end');
      }
    });
  }

  destroy() {
    this.destroyed = true;
  }
}

describe('AI Client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ANTHROPIC_API_KEY = 'test-key';
  });

  it('should correctly process multiple components and their metadata', async () => {
    const mockEvents = [
      { type: 'message_start' },
      {
        type: 'content_block_start',
        metadata: {
          componentName: 'Header',
          position: 'header',
          componentId: 'comp_header'
        }
      },
      {
        type: 'content_block_delta',
        delta: { text: 'export function Header() {...}' },
        metadata: {
          componentName: 'Header',
          position: 'header',
          componentId: 'comp_header'
        }
      },
      {
        type: 'content_block_stop',
        metadata: {
          componentName: 'Header',
          componentId: 'comp_header',
          isComplete: true
        }
      },
      { type: 'message_stop' }
    ];

    const mockStream = new MockEventStream(mockEvents);
    mockCreate.mockResolvedValue({ data: mockStream });

    const stream = await generate('Create a test component', 'modern', '');
    const receivedEvents = [];

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout waiting for events'));
      }, 5000);

      stream.on('data', (data) => {
        const eventStr = data.toString();
        if (eventStr.startsWith('data: ')) {
          try {
            const eventData = JSON.parse(eventStr.slice(6).trim());
            receivedEvents.push(eventData);
            if (receivedEvents.length === mockEvents.length) {
              clearTimeout(timeout);
              resolve();
            }
          } catch (e) {
            console.error('Failed to parse event:', eventStr, e);
          }
        }
      });

      stream.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });

      // Start the stream after setting up handlers
      mockStream.start();
    });

    expect(receivedEvents).toEqual(mockEvents);
  }, 15000);

  it('should handle authentication errors', async () => {
    const error = new Error('invalid x-api-key');
    error.status = 401;
    error.error = {
      type: 'authentication_error',
      message: 'invalid x-api-key'
    };

    mockCreate.mockRejectedValue(error);

    await expect(generate('Create a test component', 'modern', '')).rejects.toEqual({
      type: 'error',
      code: 'CLAUDE_AUTH_ERROR',
      message: 'invalid x-api-key',
      retryable: false
    });
  });

  it('should handle rate limit errors', async () => {
    const error = new Error('rate limit exceeded');
    error.status = 429;
    error.error = {
      type: 'rate_limit_error',
      message: 'rate limit exceeded'
    };

    mockCreate.mockRejectedValue(error);

    await expect(generate('Create a test component', 'modern', '')).rejects.toEqual({
      type: 'error',
      code: 'CLAUDE_RATE_LIMIT',
      message: 'rate limit exceeded',
      retryable: true
    });
  });

  it('should handle general API errors', async () => {
    const error = new Error('internal server error');
    error.status = 500;
    error.error = {
      type: 'internal_error',
      message: 'internal server error'
    };

    mockCreate.mockRejectedValue(error);

    await expect(generate('Create a test component', 'modern', '')).rejects.toEqual({
      type: 'error',
      code: 'CLAUDE_API_ERROR',
      message: 'internal server error',
      retryable: true
    });
  });

  it('should handle malformed component metadata', async () => {
    const mockEvents = [
      { type: 'message_start' },
      {
        type: 'content_block_start',
        metadata: {
          componentName: 'UnknownComponent',
          position: 'invalid',
          componentId: 'comp_unknown'
        }
      }
    ];

    const mockStream = new MockEventStream(mockEvents);
    mockCreate.mockResolvedValue({ data: mockStream });

    const stream = await generate('Create a test component', 'modern', '');
    const receivedEvents = [];

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout waiting for events'));
      }, 5000);

      stream.on('data', (data) => {
        const eventStr = data.toString();
        if (eventStr.startsWith('data: ')) {
          try {
            const eventData = JSON.parse(eventStr.slice(6).trim());
            receivedEvents.push(eventData);
            if (receivedEvents.length === mockEvents.length) {
              clearTimeout(timeout);
              resolve();
            }
          } catch (e) {
            console.error('Failed to parse event:', eventStr, e);
          }
        }
      });

      stream.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });

      // Start the stream after setting up handlers
      mockStream.start();
    });

    expect(receivedEvents[0]).toEqual({ type: 'message_start' });
    expect(receivedEvents[1].metadata.componentName).toBe('UnknownComponent');
  }, 15000);
}); 
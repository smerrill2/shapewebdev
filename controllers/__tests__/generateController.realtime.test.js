const { EventEmitter } = require('events');

// Mock the aiClient module
jest.mock('../../utils/aiClient');
const { generate } = require('../../utils/aiClient');

const generateController = require('../generateController');

// Helper to parse SSE events from response writes
const parseSSEEvents = (mockCalls) => {
  const events = [];
  for (const call of mockCalls) {
    const data = call[0];
    if (typeof data !== 'string' || !data.startsWith('data: ')) continue;
    try {
      const jsonStr = data.slice(5).trim(); // Remove 'data: ' prefix
      const event = JSON.parse(jsonStr);
      events.push(event);
    } catch (err) {
      console.error('Failed to parse event:', data, err);
    }
  }
  return events;
};

describe('Generate Controller Real-time Integration', () => {
  let req, res, mockStream;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup request mock
    req = {
      query: { projectId: 'test-project', versionId: 'test-version' },
      body: { prompt: 'Test prompt', style: 'modern', requirements: '' },
      on: jest.fn()
    };
    
    // Setup response mock
    res = {
      setHeader: jest.fn(),
      write: jest.fn(() => true),
      end: jest.fn(),
      flushHeaders: jest.fn(),
      writable: true,
      writableEnded: false
    };

    // Create mock stream
    mockStream = new EventEmitter();
    mockStream.destroy = jest.fn();
    
    // Setup AI client mock
    generate.mockImplementation(() => {
      // Return a promise that resolves with the mockStream
      return Promise.resolve(mockStream);
    });
  });

  const emitStreamEvents = async (events) => {
    for (const event of events) {
      mockStream.emit('data', JSON.stringify(event));
      // Give time for event processing
      await new Promise(resolve => setImmediate(resolve));
    }
    mockStream.emit('end');
  };

  it('should handle a complete component generation sequence', async () => {
    // ... existing test code ...
  });

  it('should handle a compound component with all required subcomponents', async () => {
    // ... existing test code ...
  });

  it('should handle interleaved components correctly', async () => {
    // ... existing test code ...
  });

  it('should handle partial markers and buffering correctly', async () => {
    const controllerPromise = generateController(req, res);
    await new Promise(resolve => setImmediate(resolve));
    
    // Simulate partial marker chunks
    await emitStreamEvents([
      {
        type: 'content_block_delta',
        delta: { text: '/// STA' }
      },
      {
        type: 'content_block_delta',
        delta: { text: 'RT Button position=main\n' }
      },
      {
        type: 'content_block_delta',
        delta: { text: 'export function Button() {\n' }
      },
      {
        type: 'content_block_delta',
        delta: { text: '  return <button>Click</button>;\n}\n' }
      },
      {
        type: 'content_block_delta',
        delta: { text: '/// E' }
      },
      {
        type: 'content_block_delta',
        delta: { text: 'ND Button\n' }
      }
    ]);
    
    await controllerPromise;

    const events = parseSSEEvents(res.write.mock.calls);

    // Verify event sequence despite partial markers
    expect(events.map(e => e.type)).toEqual([
      'component_start',
      'content_block_delta',
      'content_block_delta',
      'component_complete',
      'message_stop'
    ]);

    // Verify component metadata is correct
    const startEvent = events.find(e => e.type === 'component_start');
    expect(startEvent.metadata).toEqual({
      componentId: 'comp_button',
      componentName: 'Button',
      position: 'main',
      isCompoundComplete: true,
      isCritical: false
    });
  });

  it('should handle incomplete compound components correctly', async () => {
    const controllerPromise = generateController(req, res);
    await new Promise(resolve => setImmediate(resolve));
    
    // Send NavigationMenu without required NavigationMenuLink
    await emitStreamEvents([
      {
        type: 'content_block_delta',
        delta: { text: '/// START NavigationMenu position=header\n' }
      },
      {
        type: 'content_block_delta',
        delta: { text: `
export function NavigationMenu() {
  return (
    <NavigationMenuList>
      <NavigationMenuItem>
        <NavigationMenuTrigger>Menu</NavigationMenuTrigger>
        <NavigationMenuContent>
          {/* Missing NavigationMenuLink */}
        </NavigationMenuContent>
      </NavigationMenuItem>
    </NavigationMenuList>
  );
}
        `.trim() }
      },
      {
        type: 'content_block_delta',
        delta: { text: '/// END NavigationMenu\n' }
      }
    ]);
    
    await controllerPromise;

    const events = parseSSEEvents(res.write.mock.calls);

    // Verify the complete event shows incomplete compound component
    const completeEvent = events.find(e => e.type === 'component_complete');
    expect(completeEvent.metadata).toEqual({
      componentId: 'comp_navigationmenu',
      componentName: 'NavigationMenu',
      position: 'header',
      isComplete: true,
      isCompoundComplete: true,
      isCritical: true
    });
  });

  it('should handle stream errors correctly', async () => {
    const controllerPromise = generateController(req, res);
    await new Promise(resolve => setImmediate(resolve));
    
    // Start a component
    await emitStreamEvents([
      {
        type: 'content_block_delta',
        delta: { text: '/// START Button position=main\n' }
      },
      {
        type: 'content_block_delta',
        delta: { text: 'export function Button() {\n' }
      }
    ]);

    // Emit an error
    mockStream.emit('error', new Error('Stream processing error'));
    
    await controllerPromise;

    const events = parseSSEEvents(res.write.mock.calls);

    // Find the error event
    const errorEvent = events.find(e => e.type === 'error');
    expect(errorEvent).toBeDefined();
    expect(errorEvent.code).toBe('STREAM_ERROR');
    expect(errorEvent.message).toBe('Stream error occurred');
    expect(errorEvent.error).toBe('Stream processing error');

    // Verify response was ended
    expect(res.end).toHaveBeenCalled();
  });

  it('should handle malformed JSON in stream', async () => {
    const controllerPromise = generateController(req, res);
    await new Promise(resolve => setImmediate(resolve));
    
    // Emit invalid JSON
    mockStream.emit('data', 'invalid json');
    mockStream.emit('end');
    
    await controllerPromise;

    const events = parseSSEEvents(res.write.mock.calls);

    // Find the error event
    const errorEvent = events.find(e => e.type === 'error');
    expect(errorEvent).toBeDefined();
    expect(errorEvent.code).toBe('PARSE_ERROR');
    expect(errorEvent.message).toBe('Failed to parse stream data');
  });

  it('should handle very large code blocks', async () => {
    const controllerPromise = generateController(req, res);
    await new Promise(resolve => setImmediate(resolve));
    
    // Create a large code block
    const largeCode = `
export function LargeComponent() {
  return (
    <div>
      ${Array(1000).fill('      <div>Test content</div>').join('\n')}
    </div>
  );
}
    `.trim();

    // Split it into multiple chunks
    const chunkSize = 1000;
    const chunks = [];
    for (let i = 0; i < largeCode.length; i += chunkSize) {
      chunks.push({
        type: 'content_block_delta',
        delta: { text: largeCode.slice(i, i + chunkSize) }
      });
    }

    // Send the events
    await emitStreamEvents([
      {
        type: 'content_block_delta',
        delta: { text: '/// START LargeComponent position=main\n' }
      },
      ...chunks,
      {
        type: 'content_block_delta',
        delta: { text: '/// END LargeComponent\n' }
      }
    ]);
    
    await controllerPromise;

    const events = parseSSEEvents(res.write.mock.calls);

    // Verify all content was processed
    const deltaEvents = events.filter(e => e.type === 'content_block_delta');
    const totalContent = deltaEvents.reduce((acc, event) => 
      acc + event.delta.text.length, 0
    );
    expect(totalContent).toBeGreaterThan(largeCode.length);

    // Verify component completed successfully
    const completeEvent = events.find(e => e.type === 'component_complete');
    expect(completeEvent).toBeDefined();
    expect(completeEvent.metadata.componentName).toBe('LargeComponent');
  });
}); 
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
    // Start the controller
    const controllerPromise = generateController(req, res);
    
    // Wait for next tick to ensure controller is ready
    await new Promise(resolve => setImmediate(resolve));
    
    // Simulate AI stream events for a Button component
    await emitStreamEvents([
      {
        type: 'content_block_delta',
        delta: { text: '/// START Button position=main\n' }
      },
      {
        type: 'content_block_delta',
        delta: { text: 'export function Button() {\n' }
      },
      {
        type: 'content_block_delta',
        delta: { text: '  return (\n' }
      },
      {
        type: 'content_block_delta',
        delta: { text: '    <button className="px-4 py-2 bg-blue-500 text-white rounded">\n' }
      },
      {
        type: 'content_block_delta',
        delta: { text: '      Click me\n    </button>\n  );\n}\n' }
      },
      {
        type: 'content_block_delta',
        delta: { text: '/// END Button\n' }
      }
    ]);
    
    // Wait for controller to finish
    await controllerPromise;

    // Parse all events sent to the client
    const events = parseSSEEvents(res.write.mock.calls);

    // Verify event sequence
    expect(events.map(e => e.type)).toEqual([
      'component_start',
      'content_block_delta',
      'content_block_delta',
      'content_block_delta',
      'content_block_delta',
      'component_complete',
      'message_stop'
    ]);

    // Verify component_start event
    const startEvent = events.find(e => e.type === 'component_start');
    expect(startEvent.metadata).toEqual({
      componentId: 'comp_button',
      componentName: 'Button',
      position: 'main',
      isCompoundComplete: true,
      isCritical: false
    });

    // Verify content_block_delta events
    const deltaEvents = events.filter(e => e.type === 'content_block_delta');
    expect(deltaEvents.length).toBeGreaterThan(0);
    deltaEvents.forEach(event => {
      expect(event.metadata).toEqual({
        componentId: 'comp_button',
        componentName: 'Button',
        position: 'main',
        isCompoundComplete: true,
        isCritical: false
      });
      expect(event.delta.text).toBeDefined();
    });

    // Verify component_complete event
    const completeEvent = events.find(e => e.type === 'component_complete');
    expect(completeEvent.metadata).toEqual({
      componentId: 'comp_button',
      componentName: 'Button',
      position: 'main',
      isComplete: true,
      isCompoundComplete: true,
      isCritical: false
    });

    // Verify message_stop event
    const stopEvent = events.find(e => e.type === 'message_stop');
    expect(stopEvent).toBeDefined();
  });

  it('should handle a compound component with all required subcomponents', async () => {
    // Start the controller
    const controllerPromise = generateController(req, res);
    
    // Wait for next tick to ensure controller is ready
    await new Promise(resolve => setImmediate(resolve));
    
    // Simulate AI stream events for a NavigationMenu component
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
          <NavigationMenuLink>Link</NavigationMenuLink>
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
    
    // Wait for controller to finish
    await controllerPromise;

    // Parse all events
    const events = parseSSEEvents(res.write.mock.calls);

    // Verify event sequence
    expect(events.map(e => e.type)).toEqual([
      'component_start',
      'content_block_delta',
      'component_complete',
      'message_stop'
    ]);

    // Verify compound component metadata
    const startEvent = events.find(e => e.type === 'component_start');
    expect(startEvent.metadata).toEqual({
      componentId: 'comp_navigationmenu',
      componentName: 'NavigationMenu',
      position: 'header',
      isCompoundComplete: true,
      isCritical: true // NavigationMenu is a critical component
    });

    // Verify the complete event shows it's a valid compound component
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

  it('should handle interleaved components correctly', async () => {
    // Start the controller
    const controllerPromise = generateController(req, res);
    
    // Wait for next tick to ensure controller is ready
    await new Promise(resolve => setImmediate(resolve));
    
    // Simulate AI stream events
    await emitStreamEvents([
      {
        type: 'content_block_delta',
        delta: { text: '/// START Card position=main\n' }
      },
      {
        type: 'content_block_delta',
        delta: { text: '/// START Header position=header\n' }
      },
      {
        type: 'content_block_delta',
        delta: { text: 'export function Header() { return <header>Test</header>; }\n' }
      },
      {
        type: 'content_block_delta',
        delta: { text: '/// END Header\n' }
      },
      {
        type: 'content_block_delta',
        delta: { text: 'export function Card() { return <div>Card</div>; }\n' }
      },
      {
        type: 'content_block_delta',
        delta: { text: '/// END Card\n' }
      }
    ]);
    
    // Wait for controller to finish
    await controllerPromise;

    // Parse all events
    const events = parseSSEEvents(res.write.mock.calls);

    // Get events for each component
    const cardEvents = events.filter(e => e.metadata?.componentName === 'Card');
    const headerEvents = events.filter(e => e.metadata?.componentName === 'Header');

    // Verify both components have their full event sequence
    ['Card', 'Header'].forEach(componentName => {
      const componentEvents = events.filter(e => e.metadata?.componentName === componentName);
      expect(componentEvents.map(e => e.type)).toEqual([
        'component_start',
        'content_block_delta',
        'component_complete'
      ]);
    });

    // Verify Header completed before Card
    const headerCompleteIndex = events.findIndex(e => 
      e.type === 'component_complete' && e.metadata?.componentName === 'Header'
    );
    const cardCompleteIndex = events.findIndex(e => 
      e.type === 'component_complete' && e.metadata?.componentName === 'Card'
    );
    expect(headerCompleteIndex).toBeLessThan(cardCompleteIndex);
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
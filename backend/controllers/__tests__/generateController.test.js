const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

const { EventEmitter } = require('events');
const { Readable } = require('stream');
const mongoose = require('mongoose');

// Mock the aiClient module
jest.mock('../../utils/aiClient');
const { generate } = require('../../utils/aiClient');

// Import the controller after mocking dependencies
const generateController = require('../generateController');

// Helper function to parse SSE events
const parseSSEEvents = (mockCalls) => {
  const events = [];

  for (const call of mockCalls) {
    const writtenString = call[0];
    if (typeof writtenString !== 'string') continue;

    // Split by newline in case multiple SSE lines got written in one call
    const lines = writtenString.split('\n');
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const jsonString = line.slice('data: '.length).trim();
        try {
          const eventObj = JSON.parse(jsonString);
          events.push(eventObj);
        } catch (err) {
          // Ignore parse errors for lines that aren't JSON
        }
      }
    }
  }

  return events;
};

// Increase timeout for all tests
jest.setTimeout(10000);

describe('Generate Controller', () => {
  let req, res;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup request mock with required fields
    req = {
      query: {
        projectId: 'test-project',
        versionId: 'test-version'
      },
      body: {
        prompt: 'Test prompt',
        style: 'modern',
        requirements: ''
      },
      on: jest.fn((event, handler) => {
        if (event === 'close') {
          req.closeHandler = handler;
        }
      })
    };
    
    // Setup response mock with all required methods
    res = {
      setHeader: jest.fn(),
      write: jest.fn(() => true), // Return true to indicate successful write
      end: jest.fn(),
      flushHeaders: jest.fn(),
      writable: true,
      writableEnded: false,
      flush: jest.fn()
    };
  });

  describe('Request Validation', () => {
    it('should reject requests without project ID', async () => {
      const invalidReq = {
        ...req,
        query: { versionId: 'test-version' }
      };
      
      await generateController(invalidReq, res);
      
      expect(res.write).toHaveBeenCalledWith(
        expect.stringContaining('"type":"error"')
      );
      expect(res.write).toHaveBeenCalledWith(
        expect.stringContaining('"code":"MISSING_IDS"')
      );
      expect(res.end).toHaveBeenCalled();
    });

    it('should reject requests without version ID', async () => {
      const invalidReq = {
        ...req,
        query: { projectId: 'test-project' }
      };
      
      await generateController(invalidReq, res);
      
      expect(res.write).toHaveBeenCalledWith(
        expect.stringContaining('"type":"error"')
      );
      expect(res.write).toHaveBeenCalledWith(
        expect.stringContaining('"code":"MISSING_IDS"')
      );
      expect(res.end).toHaveBeenCalled();
    });
  });

  describe('SSE Setup', () => {
    it('should set up SSE headers correctly', async () => {
      // Create a minimal mock stream that does nothing
      const mockStream = new EventEmitter();
      mockStream.destroy = jest.fn();
      generate.mockResolvedValue(mockStream);
      
      // Start the controller but don't await it yet
      const controllerPromise = generateController(req, res);
      
      // Emit end immediately to complete the stream
      mockStream.emit('end');
      
      // Now await the controller
      await controllerPromise;
      
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/event-stream');
      expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-cache');
      expect(res.setHeader).toHaveBeenCalledWith('Connection', 'keep-alive');
      expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');
      expect(res.flushHeaders).toHaveBeenCalled();
    });
  });

  describe('Client Disconnection', () => {
    it('should clean up resources on client disconnect', async () => {
      // Create a proper readable stream
      const mockStream = new Readable({
        read() {}
      });
      mockStream.destroy = jest.fn();
      generate.mockResolvedValue(mockStream);
      
      // Start the controller
      const controllerPromise = generateController(req, res);
      
      // Wait for next tick to ensure controller is ready
      await new Promise(resolve => process.nextTick(resolve));
      
      // Simulate some stream activity
      mockStream.push(JSON.stringify({
        type: 'content_block_delta',
        delta: { text: '/// START Card position=main\n' }
      }));
      await new Promise(resolve => process.nextTick(resolve));
      
      // Get the close handler that was registered
      expect(req.on).toHaveBeenCalledWith('close', expect.any(Function));
      const closeHandler = req.on.mock.calls.find(call => call[0] === 'close')[1];
      
      // Simulate client disconnection
      closeHandler();
      
      // Complete the stream
      mockStream.push(null);
      
      await controllerPromise;
      
      // Verify cleanup
      expect(mockStream.destroy).toHaveBeenCalled();
      expect(res.end).toHaveBeenCalled();
    });
  });

  describe('Component Processing', () => {
    it('should process a simple component correctly', async () => {
      // Create a proper readable stream that emits chunks with markers
      const mockStream = new Readable({
        read() {} // noop
      });
      mockStream.destroy = jest.fn();
      generate.mockResolvedValue(mockStream);
      
      // Start the controller
      const controllerPromise = generateController(req, res);
      
      // Wait for next tick to ensure controller is ready
      await new Promise(resolve => process.nextTick(resolve));
      
      // Emit chunks with proper markers and content
      mockStream.push(JSON.stringify({
        type: 'content_block_delta',
        delta: { text: '/// START Card position=main\n' }
      }));
      await new Promise(resolve => process.nextTick(resolve));
      
      mockStream.push(JSON.stringify({
        type: 'content_block_delta',
        delta: { text: 'This is card content\n' }
      }));
      await new Promise(resolve => process.nextTick(resolve));
      
      mockStream.push(JSON.stringify({
        type: 'content_block_delta',
        delta: { text: '/// STOP Card\n' }
      }));
      await new Promise(resolve => process.nextTick(resolve));
      
      mockStream.push(null); // End the stream
      
      await controllerPromise;
      
      // Verify the events were emitted correctly
      expect(res.write).toHaveBeenCalledWith(expect.stringContaining('"type":"component_start"'));
      expect(res.write).toHaveBeenCalledWith(expect.stringContaining('"type":"content_block_delta"'));
      expect(res.write).toHaveBeenCalledWith(expect.stringContaining('"componentName":"Card"'));
      expect(res.write).toHaveBeenCalledWith(expect.stringContaining('"position":"main"'));
      expect(res.write).toHaveBeenCalledWith(expect.stringContaining('This is card content'));
      expect(res.write).toHaveBeenCalledWith(expect.stringContaining('"type":"component_complete"'));
    });

    it('should handle split markers correctly', async () => {
      // Create a proper readable stream that emits events
      const mockStream = new Readable({
        read() {} // noop
      });
      mockStream.destroy = jest.fn();
      generate.mockResolvedValue(mockStream);
      
      const promise = generateController(req, res);
      
      // Wait for next tick to ensure controller is ready
      await new Promise(resolve => process.nextTick(resolve));
      
      // Emit events in sequence
      mockStream.push(JSON.stringify({
        type: 'content_block_delta',
        delta: { text: '/// START Header position=header\n' }
      }) + '\n\n');
      await new Promise(resolve => process.nextTick(resolve));
      
      mockStream.push(JSON.stringify({
        type: 'content_block_delta',
        delta: { text: 'export function Header() {}\n' }
      }) + '\n\n');
      await new Promise(resolve => process.nextTick(resolve));
      
      mockStream.push(JSON.stringify({
        type: 'content_block_delta',
        delta: { text: '/// END Header\n' }
      }) + '\n\n');
      await new Promise(resolve => process.nextTick(resolve));
      
      mockStream.push(null); // End the stream
      await promise;

      const events = parseSSEEvents(res.write.mock.calls);
      
      // Verify the sequence of events
      const eventTypes = events.map(e => e.type);
      expect(eventTypes).toContain('component_start');
      expect(eventTypes).toContain('content_block_delta');
      expect(eventTypes).toContain('component_complete');
      
      // Verify component metadata
      const startEvent = events.find(e => e.type === 'component_start');
      expect(startEvent.metadata.componentName).toBe('Header');
      expect(startEvent.metadata.position).toBe('header');
    });

    it('should handle interleaved components', async () => {
      // Create a proper readable stream that emits events
      const mockStream = new Readable({
        read() {} // noop
      });
      mockStream.destroy = jest.fn();
      generate.mockResolvedValue(mockStream);
      
      const promise = generateController(req, res);
      
      // Wait for next tick to ensure controller is ready
      await new Promise(resolve => process.nextTick(resolve));
      
      // Emit multiple interleaved components
      mockStream.push(JSON.stringify({
        type: 'content_block_delta',
        delta: { text: '/// START Card position=main\n' }
      }) + '\n\n');
      await new Promise(resolve => process.nextTick(resolve));
      
      mockStream.push(JSON.stringify({
        type: 'content_block_delta',
        delta: { text: 'export function Card() {\n  return <div>Card</div>;\n}\n' }
      }) + '\n\n');
      await new Promise(resolve => process.nextTick(resolve));
      
      mockStream.push(JSON.stringify({
        type: 'content_block_delta',
        delta: { text: '/// START NavigationMenu position=header\n' }
      }) + '\n\n');
      await new Promise(resolve => process.nextTick(resolve));
      
      mockStream.push(JSON.stringify({
        type: 'content_block_delta',
        delta: { text: 'export function NavigationMenu() {\n  return <nav>Nav</nav>;\n}\n' }
      }) + '\n\n');
      await new Promise(resolve => process.nextTick(resolve));
      
      mockStream.push(JSON.stringify({
        type: 'content_block_delta',
        delta: { text: '/// END NavigationMenu\n' }
      }) + '\n\n');
      await new Promise(resolve => process.nextTick(resolve));
      
      mockStream.push(JSON.stringify({
        type: 'content_block_delta',
        delta: { text: 'export function CardFooter() {\n  return <footer>Footer</footer>;\n}\n' }
      }) + '\n\n');
      await new Promise(resolve => process.nextTick(resolve));
      
      mockStream.push(JSON.stringify({
        type: 'content_block_delta',
        delta: { text: '/// END Card\n' }
      }) + '\n\n');
      await new Promise(resolve => process.nextTick(resolve));
      
      mockStream.push(null); // End the stream
      await promise;

      const events = parseSSEEvents(res.write.mock.calls);

      // Verify we have all required events for both components
      const cardEvents = events.filter(e => e.metadata?.componentName === 'Card');
      const navEvents = events.filter(e => e.metadata?.componentName === 'NavigationMenu');

      // Verify Card component events
      expect(cardEvents.some(e => e.type === 'component_start')).toBe(true);
      expect(cardEvents.some(e => e.type === 'content_block_delta')).toBe(true);
      expect(cardEvents.some(e => e.type === 'component_complete')).toBe(true);

      // Verify NavigationMenu component events
      expect(navEvents.some(e => e.type === 'component_start')).toBe(true);
      expect(navEvents.some(e => e.type === 'content_block_delta')).toBe(true);
      expect(navEvents.some(e => e.type === 'component_complete')).toBe(true);

      // Verify the general sequence (Nav should complete before Card)
      const navCompleteIndex = events.findIndex(e => 
        e.type === 'component_complete' && 
        e.metadata?.componentName === 'NavigationMenu'
      );
      const cardCompleteIndex = events.findIndex(e => 
        e.type === 'component_complete' && 
        e.metadata?.componentName === 'Card'
      );
      expect(navCompleteIndex).toBeLessThan(cardCompleteIndex);
    });
  });

  describe('Error Handling', () => {
    it('should handle stream processing errors', async () => {
      const mockStream = new Readable({
        read() {}
      });
      mockStream.destroy = jest.fn();
      generate.mockResolvedValue(mockStream);
      
      const processPromise = generateController(req, res);
      
      // Wait for next tick to ensure controller is ready
      await new Promise(resolve => process.nextTick(resolve));
      
      // Emit some valid data first
      mockStream.push('/// START Card position=main\n');
      await new Promise(resolve => process.nextTick(resolve));
      
      // Emit an error
      mockStream.emit('error', new Error('Stream processing error'));
      
      await processPromise;
      
      expect(res.write).toHaveBeenCalledWith(
        expect.stringContaining('"type":"error"')
      );
      expect(res.write).toHaveBeenCalledWith(
        expect.stringContaining('Stream processing error')
      );
      expect(mockStream.destroy).toHaveBeenCalled();
    });

    it('should handle AI client errors', async () => {
      generate.mockRejectedValue(new Error('AI client error'));
      
      await generateController(req, res);

      expect(res.write).toHaveBeenCalledWith(
        expect.stringContaining('"type":"error"')
      );
      expect(res.write).toHaveBeenCalledWith(
        expect.stringContaining('"code":"CONTROLLER_ERROR"')
      );
      expect(res.end).toHaveBeenCalled();
    });

    it('should handle response write errors', async () => {
      const mockStream = new Readable({
        read() {}
      });
      mockStream.destroy = jest.fn();
      generate.mockResolvedValue(mockStream);
      
      // Make write fail
      res.write.mockReturnValue(false);
      
      const processPromise = generateController(req, res);
      
      // Wait for next tick to ensure controller is ready
      await new Promise(resolve => process.nextTick(resolve));
      
      // Emit some data
      mockStream.push('/// START Card position=main\n');
      await new Promise(resolve => process.nextTick(resolve));
      
      mockStream.push('Some content\n');
      await new Promise(resolve => process.nextTick(resolve));
      
      mockStream.push(null);
      
      await processPromise;
      
      expect(mockStream.destroy).toHaveBeenCalled();
    });
  });
});

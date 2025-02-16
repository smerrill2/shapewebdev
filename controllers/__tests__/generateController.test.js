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

describe('Generate Controller', () => {
  let req, res, mockStream;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
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
      on: jest.fn()
    };
    
    res = {
      setHeader: jest.fn(),
      write: jest.fn(() => true),
      end: jest.fn(),
      flushHeaders: jest.fn(),
      writable: true,
      writableEnded: false,
      flush: jest.fn()
    };

    // Create a proper readable stream that emits events
    mockStream = new EventEmitter();
    mockStream.destroy = jest.fn();
    generate.mockResolvedValue(mockStream);
  });

  describe('Request Validation', () => {
    it('should reject requests without project ID', async () => {
      delete req.query.projectId;
      await generateController(req, res);
      
      expect(res.write).toHaveBeenCalledWith(expect.stringContaining('"type":"error"'));
      expect(res.write).toHaveBeenCalledWith(expect.stringContaining('"code":"MISSING_IDS"'));
      expect(res.end).toHaveBeenCalled();
    });

    it('should reject requests without version ID', async () => {
      delete req.query.versionId;
      await generateController(req, res);
      
      expect(res.write).toHaveBeenCalledWith(expect.stringContaining('"type":"error"'));
      expect(res.write).toHaveBeenCalledWith(expect.stringContaining('"code":"MISSING_IDS"'));
      expect(res.end).toHaveBeenCalled();
    });
  });

  describe('SSE Setup', () => {
    it('should set up SSE headers correctly', async () => {
      const promise = generateController(req, res);
      mockStream.emit('end');
      await promise;
      
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/event-stream');
      expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-cache');
      expect(res.setHeader).toHaveBeenCalledWith('Connection', 'keep-alive');
      expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');
      expect(res.flushHeaders).toHaveBeenCalled();
    });
  });

  describe('Client Disconnection', () => {
    it('should clean up resources on client disconnect', async () => {
      const promise = generateController(req, res);
      
      // Get the close handler from the mock
      expect(req.on).toHaveBeenCalledWith('close', expect.any(Function));
      const [, closeHandler] = req.on.mock.calls[0];
      
      // Call the close handler
      closeHandler();
      
      // Complete the stream
      mockStream.emit('end');
      await promise;
      
      expect(mockStream.destroy).toHaveBeenCalled();
    });
  });

  describe('Component Processing', () => {
    it('should process a simple component correctly', async () => {
      const promise = generateController(req, res);
      
      // Emit events in sequence
      mockStream.emit('data', Buffer.from(JSON.stringify({
        type: 'content_block_delta',
        delta: { text: '/// START Header position=header\n' }
      }) + '\n\n'));

      mockStream.emit('data', Buffer.from(JSON.stringify({
        type: 'content_block_delta',
        delta: { text: 'export function Header() {\n  return <div>Header</div>;\n}\n' }
      }) + '\n\n'));

      mockStream.emit('data', Buffer.from(JSON.stringify({
        type: 'content_block_delta',
        delta: { text: '/// END Header' }
      }) + '\n\n'));

      // Complete the stream
      mockStream.emit('end');
      await promise;

      const events = parseSSEEvents(res.write.mock.calls);
      
      // Verify component_start
      expect(events.some(e => 
        e.type === 'content_block_start' && 
        e.metadata.componentName === 'Header'
      )).toBe(true);
      
      // Verify content delta
      expect(events.some(e => 
        e.type === 'content_block_delta' && 
        e.delta.text.includes('export function Header()')
      )).toBe(true);
      
      // Verify component_stop
      expect(events.some(e => 
        e.type === 'content_block_stop' && 
        e.metadata.componentId === 'comp_header'
      )).toBe(true);
    });

    it('should handle split markers correctly', async () => {
      const promise = generateController(req, res);
      
      // Emit events in sequence
      mockStream.emit('data', Buffer.from(JSON.stringify({
        type: 'content_block_delta',
        delta: { text: '/// START Header position=header\n' }
      }) + '\n\n'));

      mockStream.emit('data', Buffer.from(JSON.stringify({
        type: 'content_block_delta',
        delta: { text: 'export function Header() {}\n/// END Header' }
      }) + '\n\n'));

      mockStream.emit('end');
      await promise;

      const events = parseSSEEvents(res.write.mock.calls);
      
      // Verify the sequence of events
      const eventTypes = events.map(e => e.type);
      expect(eventTypes).toContain('content_block_start');
      expect(eventTypes).toContain('content_block_delta');
      expect(eventTypes).toContain('content_block_stop');
      
      // Verify component metadata
      const startEvent = events.find(e => e.type === 'content_block_start');
      expect(startEvent.metadata.componentName).toBe('Header');
      expect(startEvent.metadata.position).toBe('header');
    });

    it('should handle interleaved components', async () => {
      const promise = generateController(req, res);
      
      // Emit multiple interleaved components
      mockStream.emit('data', Buffer.from(JSON.stringify({
        type: 'content_block_delta',
        delta: { text: '/// START Card position=main\n' }
      }) + '\n\n'));

      mockStream.emit('data', Buffer.from(JSON.stringify({
        type: 'content_block_delta',
        delta: { text: 'export function Card() {\n  return <div>Card</div>;\n}\n' }
      }) + '\n\n'));

      mockStream.emit('data', Buffer.from(JSON.stringify({
        type: 'content_block_delta',
        delta: { text: '/// START NavigationMenu position=header\n' }
      }) + '\n\n'));

      mockStream.emit('data', Buffer.from(JSON.stringify({
        type: 'content_block_delta',
        delta: { text: 'export function NavigationMenu() {\n  return <nav>Nav</nav>;\n}\n' }
      }) + '\n\n'));

      mockStream.emit('data', Buffer.from(JSON.stringify({
        type: 'content_block_delta',
        delta: { text: '/// END NavigationMenu' }
      }) + '\n\n'));

      mockStream.emit('data', Buffer.from(JSON.stringify({
        type: 'content_block_delta',
        delta: { text: 'export function CardFooter() {\n  return <footer>Footer</footer>;\n}\n' }
      }) + '\n\n'));

      mockStream.emit('data', Buffer.from(JSON.stringify({
        type: 'content_block_delta',
        delta: { text: '/// END Card' }
      }) + '\n\n'));

      mockStream.emit('end');
      await promise;

      const events = parseSSEEvents(res.write.mock.calls);

      // Verify we have all required events for both components
      const cardEvents = events.filter(e => e.metadata?.componentName === 'Card');
      const navEvents = events.filter(e => e.metadata?.componentName === 'NavigationMenu');

      // Verify Card component events
      expect(cardEvents.some(e => e.type === 'content_block_start')).toBe(true);
      expect(cardEvents.some(e => e.type === 'content_block_delta')).toBe(true);
      expect(cardEvents.some(e => e.type === 'content_block_stop')).toBe(true);

      // Verify NavigationMenu component events
      expect(navEvents.some(e => e.type === 'content_block_start')).toBe(true);
      expect(navEvents.some(e => e.type === 'content_block_delta')).toBe(true);
      expect(navEvents.some(e => e.type === 'content_block_stop')).toBe(true);

      // Verify the general sequence (Nav should complete before Card)
      const navCompleteIndex = events.findIndex(e => 
        e.type === 'content_block_stop' && 
        e.metadata?.componentName === 'NavigationMenu'
      );
      const cardCompleteIndex = events.findIndex(e => 
        e.type === 'content_block_stop' && 
        e.metadata?.componentName === 'Card'
      );
      expect(navCompleteIndex).toBeLessThan(cardCompleteIndex);
    });
  });

  describe('Error Handling', () => {
    it('should handle stream processing errors', async () => {
      const promise = generateController(req, res);
      
      // Send invalid JSON
      mockStream.emit('data', Buffer.from('{invalid json}\n\n'));
      
      // Complete the stream
      mockStream.emit('end');
      await promise;
      
      expect(res.write).toHaveBeenCalledWith(expect.stringContaining('"type":"error"'));
      expect(res.write).toHaveBeenCalledWith(expect.stringContaining('"code":"PARSE_ERROR"'));
    });

    it('should handle AI client errors', async () => {
      generate.mockRejectedValue(new Error('AI client error'));
      await generateController(req, res);

      expect(res.write).toHaveBeenCalledWith(expect.stringContaining('"type":"error"'));
      expect(res.write).toHaveBeenCalledWith(expect.stringContaining('"code":"CONTROLLER_ERROR"'));
      expect(res.end).toHaveBeenCalled();
    });

    it('should handle response write errors', async () => {
      const promise = generateController(req, res);
      
      // Make response unwritable
      res.write.mockImplementationOnce(() => {
        res.writable = false;
        return false;
      });
      
      // Send some data
      mockStream.emit('data', Buffer.from(JSON.stringify({
        type: 'content_block_delta',
        delta: { text: 'some content' }
      }) + '\n\n'));

      // Complete the stream
      mockStream.emit('end');
      await promise;
      
      expect(mockStream.destroy).toHaveBeenCalled();
    });
  });
}); 
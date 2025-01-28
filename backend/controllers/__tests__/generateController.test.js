const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

const { EventEmitter } = require('events');
const { Readable } = require('stream');
const mongoose = require('mongoose');
const { generate } = require('../../utils/aiClient');

// Mock the aiClient module before requiring generateController
const mockGenerate = jest.fn();
jest.mock('../../utils/aiClient', () => ({
  generate: mockGenerate
}));

const generateController = require('../generateController');

// Helper to create SSE formatted string
const formatSSE = (data) => `data: ${JSON.stringify(data)}\n\n`;

// Create a mock stream that emits Anthropic-style events
class MockAnthropicStream extends Readable {
  constructor(completions = []) {
    super();
    this.completions = completions;
    this.currentIndex = 0;
    this.destroyed = false;
  }

  _read() {
    if (this.currentIndex < this.completions.length && !this.destroyed) {
      this.push(JSON.stringify({ completion: this.completions[this.currentIndex++] }));
    } else if (!this.destroyed) {
      this.push(null);
    }
  }

  destroy() {
    this.destroyed = true;
    super.destroy();
  }
}

// Helper to collect SSE events from the response
const collectEvents = (mockRes) => {
  const events = [];
  const originalWrite = mockRes.write;

  mockRes.write = jest.fn((data) => {
    if (data.startsWith('data: ')) {
      events.push(JSON.parse(data.slice(5)));
    }
    return true;
  });

  return events;
};

describe('Generate Controller', () => {
  let req;
  let res;
  let events;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ANTHROPIC_API_KEY = 'test-key';
    
    req = {
      query: {
        projectId: new mongoose.Types.ObjectId().toString(),
        versionId: new mongoose.Types.ObjectId().toString()
      },
      body: {
        prompt: 'Create a test component',
        style: 'modern',
        requirements: ''
      },
      on: jest.fn(),
      removeListener: jest.fn()
    };

    // Update res mock to handle Buffer data
    const writtenData = [];
    res = {
      setHeader: jest.fn(),
      write: jest.fn(data => {
        writtenData.push(data instanceof Buffer ? data : Buffer.from(data));
        return true;
      }),
      getWrittenData: () => Buffer.concat(writtenData).toString(),
      end: jest.fn(),
      flushHeaders: jest.fn(),
      writable: true,
      writableEnded: false,
      flush: jest.fn()
    };

    events = collectEvents(res);
  });

  describe('Stream Transformation', () => {
    it('should properly transform Anthropic stream into component blocks', async () => {
      const mockStream = new MockAnthropicStream([
        '/// START Header position=header\n',
        'export function Header() {\n',
        '  return <div>Header</div>;\n',
        '}\n/// END Header\n',
        '/// START Footer position=footer\n',
        'export function Footer() {\n',
        '  return <div>Footer</div>;\n',
        '}\n/// END Footer'
      ]);

      mockGenerate.mockResolvedValue(mockStream);
      await generateController(req, res);
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify component blocks were properly transformed
      expect(events).toContainEqual({
        type: 'content_block_start',
        metadata: {
          componentName: 'Header',
          position: 'header',
          componentId: 'comp_header'
        }
      });

      expect(events).toContainEqual({
        type: 'content_block_delta',
        metadata: { componentId: 'comp_header' },
        delta: { text: 'export function Header() {\n  return <div>Header</div>;\n}' }
      });

      // Verify sections are tracked and included in stop events
      const stopEvent = events.find(e => 
        e.type === 'content_block_stop' && 
        e.metadata.componentId === 'comp_header'
      );
      expect(stopEvent.metadata.sections).toEqual({
        header: ['comp_header'],
        main: [],
        footer: ['comp_footer']
      });
    });

    it('should handle RootLayout without START/END markers', async () => {
      const mockStream = new MockAnthropicStream([
        'export const RootLayout = () => {\n',
        '  return (\n',
        '    <div>Root</div>\n',
        '  );\n',
        '};'
      ]);

      mockGenerate.mockResolvedValue(mockStream);
      await generateController(req, res);
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify RootLayout was detected and processed
      expect(events).toContainEqual({
        type: 'content_block_start',
        metadata: {
          componentName: 'RootLayout',
          position: 'main',
          componentId: 'root_layout'
        }
      });

      // Verify RootLayout code was captured
      const deltaEvent = events.find(e => 
        e.type === 'content_block_delta' && 
        e.metadata.componentId === 'root_layout'
      );
      expect(deltaEvent.delta.text).toContain('export const RootLayout = () => {');
    });

    it('should validate component structure', async () => {
      const mockStream = new MockAnthropicStream([
        '/// START InvalidComponent position=main\n',
        'function InvalidComponent() {\n', // Missing export
        '  console.log("No return statement");\n',
        '}\n/// END InvalidComponent'
      ]);

      mockGenerate.mockResolvedValue(mockStream);
      await generateController(req, res);
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify component was started but no delta was sent due to validation failure
      expect(events).toContainEqual({
        type: 'content_block_start',
        metadata: {
          componentName: 'InvalidComponent',
          position: 'main',
          componentId: 'comp_invalidcomponent'
        }
      });

      // Verify no delta event was sent for invalid component
      expect(events.find(e => 
        e.type === 'content_block_delta' && 
        e.metadata.componentId === 'comp_invalidcomponent'
      )).toBeUndefined();
    });

    it('should handle buffer overflow', async () => {
      const largeChunk = 'x'.repeat(1024 * 1024 + 1); // Exceeds MAX_BUFFER_SIZE
      const mockStream = new MockAnthropicStream([
        largeChunk,
        '/// START ValidComponent position=main\n',
        'export function ValidComponent() {\n',
        '  return <div>Valid</div>;\n',
        '}\n/// END ValidComponent'
      ]);

      mockGenerate.mockResolvedValue(mockStream);
      await generateController(req, res);
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify valid component was still processed after overflow
      expect(events).toContainEqual({
        type: 'content_block_start',
        metadata: {
          componentName: 'ValidComponent',
          position: 'main',
          componentId: 'comp_validcomponent'
        }
      });
    });

    it('should handle partial line streaming', async () => {
      const mockStream = new MockAnthropicStream([
        '/// START Header ',
        'position=header\n',
        'export function ',
        'Header() {\n',
        '  return <div>',
        'Header</div>;\n',
        '}\n/// END Header'
      ]);

      mockGenerate.mockResolvedValue(mockStream);
      await generateController(req, res);
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify component was properly assembled from partial chunks
      const deltaEvent = events.find(e => 
        e.type === 'content_block_delta' && 
        e.metadata.componentId === 'comp_header'
      );
      expect(deltaEvent.delta.text).toBe(
        'export function Header() {\n  return <div>Header</div>;\n}'
      );
    });

    it('should include final sections state in message_stop', async () => {
      const mockStream = new MockAnthropicStream([
        '/// START Header position=header\n',
        'export function Header() { return <div>Header</div>; }\n',
        '/// END Header\n',
        '/// START Main position=main\n',
        'export function Main() { return <div>Main</div>; }\n',
        '/// END Main\n',
        '/// START Footer position=footer\n',
        'export function Footer() { return <div>Footer</div>; }\n',
        '/// END Footer'
      ]);

      mockGenerate.mockResolvedValue(mockStream);
      await generateController(req, res);
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify final message includes complete sections state
      const stopEvent = events.find(e => e.type === 'message_stop');
      expect(stopEvent.metadata.sections).toEqual({
        header: ['comp_header'],
        main: ['comp_main'],
        footer: ['comp_footer']
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid JSON in stream', async () => {
      const mockStream = new MockAnthropicStream(['not valid json']);
      mockStream._read = function() {
        this.push('{invalid json}');
        this.push(null);
      };

      mockGenerate.mockResolvedValue(mockStream);
      await generateController(req, res);
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(events).toContainEqual(expect.objectContaining({
        type: 'error',
        code: 'STREAM_PROCESSING_ERROR'
      }));
    });

    it('should handle client disconnection', async () => {
      const mockStream = new MockAnthropicStream([
        '/// START Header position=header\n'
      ]);

      mockGenerate.mockResolvedValue(mockStream);
      const streamDestroySpy = jest.spyOn(mockStream, 'destroy');

      // Simulate client disconnect
      req.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          callback();
        }
      });

      await generateController(req, res);
      expect(streamDestroySpy).toHaveBeenCalled();
    });
  });
});

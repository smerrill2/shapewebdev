const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

const { EventEmitter } = require('events');
const { Readable } = require('stream');

// Mock the aiClient module
jest.mock('../../utils/aiClient');
const { generate } = require('../../utils/aiClient');

// Import the controller
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

describe('Generate Controller Frontend Integration', () => {
  let req, res;
  
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
  });

  describe('Frontend Event Format', () => {
    it('should emit events in the format expected by LivePreviewTestPage', async () => {
      const mockStream = new Readable({
        read() {} // noop
      });
      mockStream.destroy = jest.fn();
      generate.mockResolvedValue(mockStream);
      
      const promise = generateController(req, res);
      
      // Wait for next tick to ensure controller is ready
      await new Promise(resolve => process.nextTick(resolve));
      
      // Emit a complete component with all required fields
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
        delta: { text: '/// END Card\n' }
      }) + '\n\n');
      await new Promise(resolve => process.nextTick(resolve));
      
      mockStream.push(null);
      await promise;

      const events = parseSSEEvents(res.write.mock.calls);

      // Verify each event type individually for better error messages
      const startEvent = events.find(e => e.type === 'component_start');
      expect(startEvent).toBeDefined();
      expect(startEvent.metadata).toEqual(
        expect.objectContaining({
          componentId: 'comp_card',
          componentName: 'Card',
          position: 'main',
          isCompoundComplete: expect.any(Boolean),
          isCritical: expect.any(Boolean)
        })
      );

      const deltaEvent = events.find(e => e.type === 'content_block_delta');
      expect(deltaEvent).toBeDefined();
      expect(deltaEvent.metadata).toEqual(
        expect.objectContaining({
          componentId: 'comp_card',
          componentName: 'Card',
          position: 'main',
          isCompoundComplete: expect.any(Boolean),
          isCritical: expect.any(Boolean)
        })
      );
      expect(deltaEvent.delta).toEqual(
        expect.objectContaining({
          text: expect.any(String)
        })
      );

      const completeEvent = events.find(e => e.type === 'component_complete');
      expect(completeEvent).toBeDefined();
      expect(completeEvent.metadata).toEqual(
        expect.objectContaining({
          componentId: 'comp_card',
          componentName: 'Card',
          position: 'main',
          isComplete: true,
          isCompoundComplete: expect.any(Boolean),
          isCritical: expect.any(Boolean)
        })
      );
    });

    it('should handle compound components with subcomponents', async () => {
      const mockStream = new Readable({
        read() {} // noop
      });
      mockStream.destroy = jest.fn();
      generate.mockResolvedValue(mockStream);
      
      const promise = generateController(req, res);
      await new Promise(resolve => process.nextTick(resolve));
      
      // Emit a NavigationMenu component with all required subcomponents
      mockStream.push(JSON.stringify({
        type: 'content_block_delta',
        delta: { text: '/// START NavigationMenu position=header\n' }
      }) + '\n\n');
      await new Promise(resolve => process.nextTick(resolve));
      
      mockStream.push(JSON.stringify({
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
        `}
      }) + '\n\n');
      await new Promise(resolve => process.nextTick(resolve));
      
      mockStream.push(JSON.stringify({
        type: 'content_block_delta',
        delta: { text: '/// END NavigationMenu\n' }
      }) + '\n\n');
      await new Promise(resolve => process.nextTick(resolve));
      
      mockStream.push(null);
      await promise;

      const events = parseSSEEvents(res.write.mock.calls);
      
      // Find the completion event
      const completeEvent = events.find(e => 
        e.type === 'component_complete' && 
        e.metadata.componentName === 'NavigationMenu'
      );

      expect(completeEvent).toBeDefined();
      expect(completeEvent.metadata).toEqual(
        expect.objectContaining({
          componentId: 'comp_navigationmenu',
          componentName: 'NavigationMenu',
          position: 'header',
          isComplete: true,
          isCompoundComplete: true,
          isCritical: true
        })
      );
    });

    it('should handle critical components with proper metadata', async () => {
      const mockStream = new Readable({
        read() {} // noop
      });
      mockStream.destroy = jest.fn();
      generate.mockResolvedValue(mockStream);
      
      const promise = generateController(req, res);
      await new Promise(resolve => process.nextTick(resolve));
      
      // Emit a Header component (which is critical)
      mockStream.push(JSON.stringify({
        type: 'content_block_delta',
        delta: { text: '/// START Header position=header\n' }
      }) + '\n\n');
      await new Promise(resolve => process.nextTick(resolve));
      
      mockStream.push(JSON.stringify({
        type: 'content_block_delta',
        delta: { text: 'export function Header() { return <header>Test</header>; }\n' }
      }) + '\n\n');
      await new Promise(resolve => process.nextTick(resolve));
      
      mockStream.push(JSON.stringify({
        type: 'content_block_delta',
        delta: { text: '/// END Header\n' }
      }) + '\n\n');
      await new Promise(resolve => process.nextTick(resolve));
      
      mockStream.push(null);
      await promise;

      const events = parseSSEEvents(res.write.mock.calls);
      
      // Verify critical component metadata
      events.forEach(event => {
        if (event.metadata?.componentName === 'Header') {
          expect(event.metadata).toEqual(
            expect.objectContaining({
              componentId: 'comp_header',
              componentName: 'Header',
              position: 'header',
              isCritical: true,
              isCompoundComplete: expect.any(Boolean)
            })
          );
        }
      });
    });

    it('should handle navigation components correctly', async () => {
      const mockStream = new Readable({
        read() {} // noop
      });
      mockStream.destroy = jest.fn();
      generate.mockResolvedValue(mockStream);
      
      const promise = generateController(req, res);
      await new Promise(resolve => process.nextTick(resolve));
      
      // Test Navigation component
      mockStream.push(JSON.stringify({
        type: 'content_block_delta',
        delta: { text: '/// START Navigation position=header\n' }
      }) + '\n\n');
      await new Promise(resolve => process.nextTick(resolve));
      
      // Add NavigationMenu subcomponents to make it a valid compound component
      mockStream.push(JSON.stringify({
        type: 'content_block_delta',
        delta: { text: `
          export function Navigation() {
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
        `}
      }) + '\n\n');
      await new Promise(resolve => process.nextTick(resolve));
      
      mockStream.push(JSON.stringify({
        type: 'content_block_delta',
        delta: { text: '/// END Navigation\n' }
      }) + '\n\n');
      await new Promise(resolve => process.nextTick(resolve));
      
      mockStream.push(null);
      await promise;

      const events = parseSSEEvents(res.write.mock.calls);
      
      // Verify Navigation component metadata
      const startEvent = events.find(e => e.type === 'component_start');
      expect(startEvent).toBeDefined();
      expect(startEvent.metadata).toEqual(
        expect.objectContaining({
          componentId: 'comp_navigation',
          componentName: 'Navigation',
          position: 'header',
          isCompoundComplete: true // Now true because we included all required subcomponents
        })
      );

      // Verify the complete event
      const completeEvent = events.find(e => e.type === 'component_complete');
      expect(completeEvent).toBeDefined();
      expect(completeEvent.metadata).toEqual(
        expect.objectContaining({
          componentId: 'comp_navigation',
          componentName: 'Navigation',
          position: 'header',
          isComplete: true,
          isCompoundComplete: true
        })
      );
    });
  });

  describe('SimpleLivePreview Integration', () => {
    it('should emit properly formatted code with START/END markers', async () => {
      const mockStream = new Readable({ read() {} });
      mockStream.destroy = jest.fn();
      generate.mockResolvedValue(mockStream);
      
      const promise = generateController(req, res);
      await new Promise(resolve => process.nextTick(resolve));
      
      // Test proper code formatting with content_block_start event
      mockStream.push(JSON.stringify({
        type: 'content_block_start',
        metadata: {
          componentId: 'comp_card',
          componentName: 'Card',
          position: 'main'
        }
      }) + '\n\n');
      await new Promise(resolve => process.nextTick(resolve));
      
      mockStream.push(JSON.stringify({
        type: 'content_block_delta',
        metadata: {
          componentId: 'comp_card',
          componentName: 'Card',
          position: 'main'
        },
        delta: { text: `
          export function Card({ title, content }) {
            return (
              <div className="rounded-lg p-4 bg-white shadow-md">
                <h2 className="text-xl font-bold">{title}</h2>
                <p>{content}</p>
              </div>
            );
          }
        `}
      }) + '\n\n');
      await new Promise(resolve => process.nextTick(resolve));
      
      mockStream.push(JSON.stringify({
        type: 'content_block_stop',
        metadata: {
          componentId: 'comp_card',
          componentName: 'Card',
          position: 'main',
          isComplete: true
        }
      }) + '\n\n');
      await new Promise(resolve => process.nextTick(resolve));
      
      mockStream.push(JSON.stringify({
        type: 'message_stop'
      }) + '\n\n');
      
      mockStream.push(null);
      await promise;

      const events = parseSSEEvents(res.write.mock.calls);
      
      // Verify event sequence
      const eventTypes = events.map(e => e.type);
      expect(eventTypes).toEqual([
        'content_block_start',
        'content_block_stop',
        'message_stop'
      ]);

      // Verify component metadata
      const startEvent = events.find(e => e.type === 'content_block_start');
      expect(startEvent.metadata).toEqual(
        expect.objectContaining({
          componentId: 'comp_card',
          componentName: 'Card',
          position: 'main'
        })
      );

      const stopEvent = events.find(e => e.type === 'content_block_stop');
      expect(stopEvent.metadata).toEqual(
        expect.objectContaining({
          componentId: 'comp_card',
          componentName: 'Card',
          position: 'main',
          isComplete: true
        })
      );
    });

    it('should handle component dependencies correctly', async () => {
      const mockStream = new Readable({ read() {} });
      mockStream.destroy = jest.fn();
      generate.mockResolvedValue(mockStream);
      
      const promise = generateController(req, res);
      await new Promise(resolve => process.nextTick(resolve));
      
      // First emit PriceTag component
      mockStream.push(JSON.stringify({
        type: 'content_block_delta',
        delta: { text: '/// START PriceTag position=main\n' }
      }) + '\n\n');
      await new Promise(resolve => process.nextTick(resolve));
      
      mockStream.push(JSON.stringify({
        type: 'content_block_delta',
        delta: { text: `
          export function PriceTag({ price, discount }) {
            return <div>{price}</div>;
          }
        `}
      }) + '\n\n');
      await new Promise(resolve => process.nextTick(resolve));
      
      mockStream.push(JSON.stringify({
        type: 'content_block_delta',
        delta: { text: '/// END PriceTag\n' }
      }) + '\n\n');
      await new Promise(resolve => process.nextTick(resolve));
      
      // Then emit ProductCard that uses PriceTag
      mockStream.push(JSON.stringify({
        type: 'content_block_delta',
        delta: { text: '/// START ProductCard position=main\n' }
      }) + '\n\n');
      await new Promise(resolve => process.nextTick(resolve));
      
      mockStream.push(JSON.stringify({
        type: 'content_block_delta',
        delta: { text: `
          export function ProductCard({ product }) {
            return (
              <div>
                <h3>{product.name}</h3>
                <PriceTag price={product.price} discount={product.discount} />
              </div>
            );
          }
        `}
      }) + '\n\n');
      await new Promise(resolve => process.nextTick(resolve));
      
      mockStream.push(JSON.stringify({
        type: 'content_block_delta',
        delta: { text: '/// END ProductCard\n' }
      }) + '\n\n');
      
      mockStream.push(null);
      await promise;

      const events = parseSSEEvents(res.write.mock.calls);
      
      // Verify component ordering
      const componentOrder = events
        .filter(e => e.type === 'component_start')
        .map(e => e.metadata.componentName);
      
      expect(componentOrder).toEqual(['PriceTag', 'ProductCard']);
    });

    it('should emit message_stop event when stream ends', async () => {
      const mockStream = new Readable({ read() {} });
      mockStream.destroy = jest.fn();
      generate.mockResolvedValue(mockStream);
      
      const promise = generateController(req, res);
      await new Promise(resolve => process.nextTick(resolve));
      
      // Emit a simple component with proper event sequence
      mockStream.push(JSON.stringify({
        type: 'content_block_start',
        metadata: {
          componentId: 'comp_button',
          componentName: 'Button',
          position: 'main'
        }
      }) + '\n\n');
      await new Promise(resolve => process.nextTick(resolve));
      
      mockStream.push(JSON.stringify({
        type: 'content_block_delta',
        metadata: {
          componentId: 'comp_button',
          componentName: 'Button',
          position: 'main'
        },
        delta: { text: 'export function Button() { return <button>Click</button>; }\n' }
      }) + '\n\n');
      await new Promise(resolve => process.nextTick(resolve));
      
      mockStream.push(JSON.stringify({
        type: 'content_block_stop',
        metadata: {
          componentId: 'comp_button',
          componentName: 'Button',
          position: 'main',
          isComplete: true
        }
      }) + '\n\n');
      await new Promise(resolve => process.nextTick(resolve));
      
      // Emit message_stop event
      mockStream.push(JSON.stringify({
        type: 'message_stop'
      }) + '\n\n');
      
      mockStream.push(null);
      await promise;

      const events = parseSSEEvents(res.write.mock.calls);
      
      // Verify event sequence including message_stop
      const eventTypes = events.map(e => e.type);
      expect(eventTypes).toEqual([
        'content_block_start',
        'content_block_stop',
        'message_stop'
      ]);

      // Also verify the message_stop event structure
      const stopEvent = events.find(e => e.type === 'message_stop');
      expect(stopEvent).toBeDefined();
      expect(stopEvent.type).toBe('message_stop');
    });

    it('should handle layout sections correctly', async () => {
      const mockStream = new Readable({ read() {} });
      mockStream.destroy = jest.fn();
      generate.mockResolvedValue(mockStream);
      
      const promise = generateController(req, res);
      await new Promise(resolve => process.nextTick(resolve));
      
      // Emit components in different sections
      const sections = [
        { name: 'Header', position: 'header' },
        { name: 'MainContent', position: 'main' },
        { name: 'Footer', position: 'footer' }
      ];
      
      for (const section of sections) {
        mockStream.push(JSON.stringify({
          type: 'content_block_delta',
          delta: { text: `/// START ${section.name} position=${section.position}\n` }
        }) + '\n\n');
        await new Promise(resolve => process.nextTick(resolve));
        
        mockStream.push(JSON.stringify({
          type: 'content_block_delta',
          delta: { text: `export function ${section.name}() { return <div>${section.name}</div>; }\n` }
        }) + '\n\n');
        await new Promise(resolve => process.nextTick(resolve));
        
        mockStream.push(JSON.stringify({
          type: 'content_block_delta',
          delta: { text: `/// END ${section.name}\n` }
        }) + '\n\n');
        await new Promise(resolve => process.nextTick(resolve));
      }
      
      mockStream.push(null);
      await promise;

      const events = parseSSEEvents(res.write.mock.calls);
      
      // Verify section handling
      const completeEvents = events.filter(e => e.type === 'component_complete');
      
      // Each section should be in its correct position
      sections.forEach(section => {
        const sectionEvent = completeEvents.find(e => 
          e.metadata.componentName === section.name
        );
        expect(sectionEvent.metadata.position).toBe(section.position);
      });
    });
  });
}); 
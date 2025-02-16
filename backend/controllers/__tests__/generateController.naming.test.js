const { Readable } = require('stream');
const generateController = require('../generateController');

// Mock the AI client module
jest.mock('../../utils/aiClient', () => ({
  generate: jest.fn()
}));

// Get the mocked generate function
const { generate } = require('../../utils/aiClient');

// Mock response object with writable stream capabilities
class MockResponse {
  constructor() {
    this.chunks = [];
    this.headers = {};
    this.writable = true;
    this.writableEnded = false;
  }

  write(chunk) {
    this.chunks.push(chunk);
    return true;
  }

  setHeader(name, value) {
    this.headers[name] = value;
  }

  getWrittenEvents() {
    return this.chunks
      .map(chunk => chunk.toString())
      .filter(str => str.startsWith('data: '))
      .map(str => JSON.parse(str.replace('data: ', '')));
  }

  end() {
    this.writableEnded = true;
  }

  flushHeaders() {}
}

// Mock request object
const createMockRequest = (body = {}) => ({
  query: { projectId: 'test-123', versionId: 'test-456' },
  body,
  on: jest.fn(),
});

describe('generateController - Component Name Parsing', () => {
  let mockReq;
  let mockRes;

  beforeEach(() => {
    mockRes = new MockResponse();
    mockReq = createMockRequest();
    jest.clearAllMocks();
  });

  const createMockStream = (content) => {
    const stream = new Readable({
      read() {}
    });

    // Helper to push event
    const pushEvent = (event) => {
      stream.push(JSON.stringify(event));
    };

    // Push message_start
    pushEvent({
      type: 'message_start',
      message: { id: 'test-msg', model: 'claude-3', role: 'assistant' }
    });

    // Split content into lines and process each line
    const lines = content.split('\n');
    let currentBlock = '';

    for (let line of lines) {
      if (line.trim().startsWith('///')) {
        // If we have accumulated content, send it as a delta
        if (currentBlock.trim()) {
          pushEvent({
            type: 'content_block_delta',
            delta: { text: currentBlock }
          });
          currentBlock = '';
        }
        // Send the marker line
        pushEvent({
          type: 'content_block_delta',
          delta: { text: line + '\n' }
        });
      } else {
        currentBlock += line + '\n';
      }
    }

    // Send any remaining content
    if (currentBlock.trim()) {
      pushEvent({
        type: 'content_block_delta',
        delta: { text: currentBlock }
      });
    }

    // End the stream
    pushEvent({ type: 'message_stop' });
    stream.push(null);

    return stream;
  };

  const waitForStreamEnd = async () => {
    return new Promise(resolve => {
      setTimeout(resolve, 100); // Wait for stream to complete
    });
  };

  test('should correctly parse simple component names', async () => {
    const mockContent = `
/// START Header position=header
export function Header() {
  return <div>Header</div>
}
/// END Header
    `;

    generate.mockImplementation(() => createMockStream(mockContent));

    await generateController(mockReq, mockRes);
    await waitForStreamEnd();

    const events = mockRes.getWrittenEvents();
    console.log('All events:', events);
    console.log('Written chunks:', mockRes.chunks);
    
    const startEvent = events.find(e => e.type === 'content_block_start');
    
    expect(startEvent).toBeDefined();
    expect(startEvent.metadata).toEqual(expect.objectContaining({
      componentName: 'Header',
      componentId: 'comp_header',
      position: 'header'
    }));
  });

  test('should handle component names with section/layout/component suffixes', async () => {
    const mockContent = `
/// START HeaderSection position=header
export function HeaderSection() {
  return <div>Header Section</div>
}
/// END HeaderSection

/// START MainLayout position=main
export function MainLayout() {
  return <div>Main Layout</div>
}
/// END MainLayout

/// START FooterComponent position=footer
export function FooterComponent() {
  return <div>Footer Component</div>
}
/// END FooterComponent
    `;

    generate.mockImplementation(() => createMockStream(mockContent));

    await generateController(mockReq, mockRes);
    await waitForStreamEnd();

    const events = mockRes.getWrittenEvents();
    const componentEvents = events.filter(e => e.type === 'content_block_start');

    expect(componentEvents).toHaveLength(3);
    expect(componentEvents[0].metadata).toEqual(expect.objectContaining({
      componentName: 'HeaderSection',
      componentId: 'comp_headersection',
      position: 'header'
    }));
    expect(componentEvents[1].metadata).toEqual(expect.objectContaining({
      componentName: 'MainLayout',
      componentId: 'comp_mainlayout',
      position: 'main'
    }));
    expect(componentEvents[2].metadata).toEqual(expect.objectContaining({
      componentName: 'FooterComponent',
      componentId: 'comp_footercomponent',
      position: 'footer'
    }));
  });

  test('should handle aliased component names', async () => {
    const mockContent = `
/// START Navigation position=header
export function Navigation() {
  return <div>Navigation</div>
}
/// END Navigation

/// START Nav position=header
export function Nav() {
  return <div>Nav</div>
}
/// END Nav

/// START Navbar position=header
export function Navbar() {
  return <div>Navbar</div>
}
/// END Navbar
    `;

    generate.mockImplementation(() => createMockStream(mockContent));

    await generateController(mockReq, mockRes);
    await waitForStreamEnd();

    const events = mockRes.getWrittenEvents();
    const componentEvents = events.filter(e => e.type === 'content_block_start');

    // All these should be aliased to Header
    componentEvents.forEach(event => {
      expect(event.metadata).toEqual(expect.objectContaining({
        componentName: expect.any(String),
        componentId: expect.stringMatching(/^comp_/),
        position: 'header'
      }));
    });
  });

  test('should handle component names with numbers', async () => {
    const mockContent = `
/// START Section1 position=main
export function Section1() {
  return <div>Section 1</div>
}
/// END Section1

/// START Hero2Component position=main
export function Hero2Component() {
  return <div>Hero 2</div>
}
/// END Hero2Component
    `;

    generate.mockImplementation(() => createMockStream(mockContent));

    await generateController(mockReq, mockRes);
    await waitForStreamEnd();

    const events = mockRes.getWrittenEvents();
    const componentEvents = events.filter(e => e.type === 'content_block_start');

    expect(componentEvents).toHaveLength(2);
    expect(componentEvents[0].metadata).toEqual(expect.objectContaining({
      componentName: 'Section1',
      componentId: 'comp_section1',
      position: 'main'
    }));
    expect(componentEvents[1].metadata).toEqual(expect.objectContaining({
      componentName: 'Hero2Component',
      componentId: 'comp_hero2component',
      position: 'main'
    }));
  });

  test('should handle incomplete or malformed markers gracefully', async () => {
    const mockContent = `
/// START
export function Header() {}
/// END

/// START Header position=
export function Header() {}
/// END Header

/// START  Header  position=header  
export function Header() {}
/// END  Header  
    `;

    generate.mockImplementation(() => createMockStream(mockContent));

    await generateController(mockReq, mockRes);
    await waitForStreamEnd();

    const events = mockRes.getWrittenEvents();
    const errorEvents = events.filter(e => e.type === 'error');
    const startEvents = events.filter(e => e.type === 'content_block_start');

    // Should handle the well-formed marker despite the malformed ones
    expect(startEvents).toHaveLength(1);
    expect(startEvents[0].metadata).toEqual(expect.objectContaining({
      componentName: 'Header',
      componentId: 'comp_header',
      position: 'header'
    }));
  });
}); 
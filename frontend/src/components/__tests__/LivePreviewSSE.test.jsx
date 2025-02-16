import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import SimpleLivePreview from '../SimpleLivePreview';
import LivePreviewTestPage from '../LivePreviewTestPage';
import { TextEncoder, TextDecoder } from 'util';
import { jest } from '@jest/globals';
import { web } from 'stream';
import { cleanCodeForLive, applyTransformations, fixSnippet, minimalTextFix, cleanCode, fixIncompleteTags, fixReturnStatement, balanceJSXTags, fixMissingHtmlTags, mergeJSXLines, needsMerge } from '../utils/babelTransformations';
import { transform } from '@babel/standalone';

// Mock react-live
jest.mock('react-live', () => ({
  LiveProvider: ({ children, code, scope, transformCode }) => {
    try {
      if (transformCode) {
        transformCode(code);
      }
      return (
        <div data-testid="live-provider">
          {children}
          <div data-testid="live-code">{code}</div>
        </div>
      );
    } catch (error) {
      return (
        <div data-testid="live-provider">
          <div data-testid="live-error">{error.message}</div>
          {children}
        </div>
      );
    }
  },
  LivePreview: () => <div data-testid="live-preview">Preview Content</div>,
  LiveError: ({ children }) => <div data-testid="live-error">{children}</div>
}));

// Mock UI components
jest.mock('../ui', () => ({
  Button: ({ children, ...props }) => <button data-testid="ui-button" {...props}>{children}</button>,
  Card: ({ children, ...props }) => <div data-testid="ui-card" {...props}>{children}</div>,
  NavigationMenu: ({ children, ...props }) => <nav data-testid="ui-nav" {...props}>{children}</nav>,
  NavigationMenuList: ({ children, ...props }) => <ul data-testid="ui-nav-list" {...props}>{children}</ul>,
  NavigationMenuItem: ({ children, ...props }) => <li data-testid="ui-nav-item" {...props}>{children}</li>,
  NavigationMenuContent: ({ children, ...props }) => <div data-testid="ui-nav-content" {...props}>{children}</div>,
  NavigationMenuTrigger: ({ children, ...props }) => <button data-testid="ui-nav-trigger" {...props}>{children}</button>,
  NavigationMenuLink: ({ children, ...props }) => <a data-testid="ui-nav-link" {...props}>{children}</a>,
  NavigationMenuViewport: ({ children, ...props }) => <div data-testid="ui-nav-viewport" {...props}>{children}</div>
}));

// Mock compound components
jest.mock('../utils/compoundComponents', () => {
  const mockCreateCompoundComponent = () => {};
  const mockGetCompoundComponent = () => {};
  return {
    createCompoundComponent: mockCreateCompoundComponent,
    getCompoundComponent: mockGetCompoundComponent
  };
});

// Mock babel transformations
jest.mock('../utils/babelTransformations', () => {
  const mockCleanCode = (code) => code;
  const mockCleanCodeForLive = (code) => code;
  const mockExtractFunctionDefinitions = () => new Map();
  return {
    cleanCode: mockCleanCode,
    cleanCodeForLive: mockCleanCodeForLive,
    extractFunctionDefinitions: mockExtractFunctionDefinitions
  };
});

// Mock DevOverlay component
jest.mock('../DevOverlay', () => {
  return {
    __esModule: true,
    default: () => null
  };
});

// Mock cn utility
jest.mock('../utils/cn', () => ({
  cn: (...args) => args.filter(Boolean).join(' ')
}));

// Mock ReadableStream if not defined
if (typeof ReadableStream === 'undefined') {
  global.ReadableStream = class ReadableStream {
    constructor(source) {
      this.source = source;
      this.reader = null;
    }

    getReader() {
      if (!this.reader) {
        this.reader = {
          read: async () => {
            if (this.source && typeof this.source.pull === 'function') {
              return new Promise((resolve) => {
                this.source.pull({
                  enqueue: (chunk) => resolve({ value: chunk, done: false }),
                  close: () => resolve({ done: true })
                });
              });
            }
            return { done: true };
          },
          releaseLock: () => {
            this.reader = null;
          }
        };
      }
      return this.reader;
    }
  };
}

// Mock TextEncoder and TextDecoder if not defined
if (typeof TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder;
}
if (typeof TextDecoder === 'undefined') {
  global.TextDecoder = TextDecoder;
}

describe('SimpleLivePreview SSE Tests', () => {
  let registry;
  let streamingStates;
  let setStreamingStates;
  let onShowCode;
  
  beforeEach(() => {
    registry = {
      components: new Map(),
      layout: { sections: { header: [], main: [], footer: [] } }
    };
    streamingStates = new Map();
    setStreamingStates = jest.fn((updater) => {
      if (typeof updater === 'function') {
        streamingStates = updater(streamingStates);
      } else {
        streamingStates = updater;
      }
    });
    onShowCode = jest.fn();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  const dispatchStreamDeltaEvent = (data) => {
    const event = new CustomEvent('stream_delta', {
      detail: {
        type: 'content_block_delta',
        metadata: {
          componentId: data.componentId,
          componentName: data.componentName,
          position: data.position || 'main',
          isCompoundComplete: data.isCompoundComplete || true,
          isCritical: data.isCritical || false
        },
        delta: {
          text: data.code
        }
      }
    });
    window.dispatchEvent(event);
  };

  // Helper to wait for state updates
  const waitForStateUpdate = () => new Promise(resolve => setTimeout(resolve, 0));

  it('should handle streaming component data correctly', async () => {
    const buttonCode = `
      export default function Button() {
        return <button data-testid="test-button">Click me</button>;
      }
    `;

    const navCode = `
      export default function Nav() {
        return <nav data-testid="test-nav">Navigation</nav>;
      }
    `;

    const { rerender } = render(
      <SimpleLivePreview
        registry={registry}
        streamingStates={streamingStates}
        setStreamingStates={setStreamingStates}
        onShowCode={onShowCode}
      />
    );

    // Dispatch component data
    await act(async () => {
      dispatchStreamDeltaEvent({
        componentId: 'test-button',
        componentName: 'Button',
        code: buttonCode
      });

      dispatchStreamDeltaEvent({
        componentId: 'test-nav',
        componentName: 'Nav',
        code: navCode
      });

      // Update registry
      registry.components.set('test-button', {
        name: 'Button',
        code: buttonCode,
        position: 'main',
        isComplete: true
      });

      registry.components.set('test-nav', {
        name: 'Nav',
        code: navCode,
        position: 'main',
        isComplete: true
      });

      // Update streaming states
      setStreamingStates(new Map([
        ['test-button', {
          isStreaming: false,
          isComplete: true,
          error: null
        }],
        ['test-nav', {
          isStreaming: false,
          isComplete: true,
          error: null
        }]
      ]));

      window.dispatchEvent(new CustomEvent('content_block_stop', {
        detail: {
          type: 'content_block_stop',
          metadata: { componentId: 'test-button' }
        }
      }));

      window.dispatchEvent(new CustomEvent('content_block_stop', {
        detail: {
          type: 'content_block_stop',
          metadata: { componentId: 'test-nav' }
        }
      }));

      window.dispatchEvent(new CustomEvent('message_stop', {
        detail: { type: 'message_stop' }
      }));

      // Wait for state updates
      await waitForStateUpdate();
    });

    // Re-render to trigger updates
    rerender(
      <SimpleLivePreview
        registry={registry}
        streamingStates={streamingStates}
        setStreamingStates={setStreamingStates}
        onShowCode={onShowCode}
      />
    );

    // Wait for component to update
    await waitFor(() => {
      expect(screen.getByTestId('live-provider')).toBeInTheDocument();
      expect(screen.getByTestId('live-preview-container')).toBeInTheDocument();
      expect(screen.getByTestId('live-preview')).toBeInTheDocument();
    });
  });

  it('should handle errors in SSE data', async () => {
    const { rerender } = render(
      <SimpleLivePreview
        registry={registry}
        streamingStates={streamingStates}
        setStreamingStates={setStreamingStates}
        onShowCode={onShowCode}
      />
    );

    // Dispatch invalid code that will cause a transform error
    await act(async () => {
      const invalidCode = `
        export default function ErrorComponent() {
          return <div> {(() => { throw new Error('Test error'); })())} </div>;
        }
      `;

      dispatchStreamDeltaEvent({
        componentId: 'error-component',
        componentName: 'ErrorComponent',
        code: invalidCode,
        position: 'main'
      });

      // Update registry with invalid code
      registry.components.set('error-component', {
        name: 'ErrorComponent',
        code: invalidCode,
        position: 'main',
        isComplete: true
      });

      // Update streaming states
      setStreamingStates(new Map([
        ['error-component', {
          isStreaming: false,
          isComplete: true,
          error: null
        }]
      ]));

      window.dispatchEvent(new CustomEvent('content_block_stop', {
        detail: {
          type: 'content_block_stop',
          metadata: { componentId: 'error-component' }
        }
      }));

      window.dispatchEvent(new CustomEvent('message_stop', {
        detail: { type: 'message_stop' }
      }));

      // Wait for state updates
      await waitForStateUpdate();
    });

    // Re-render to trigger updates
    rerender(
      <SimpleLivePreview
        registry={registry}
        streamingStates={streamingStates}
        setStreamingStates={setStreamingStates}
        onShowCode={onShowCode}
      />
    );

    // Wait for error to be displayed
    await waitFor(() => {
      const errorElements = screen.queryAllByTestId('live-error');
      expect(errorElements.length).toBeGreaterThan(0);
      expect(errorElements[0]).toHaveTextContent('Test error');
    });
  });

  it('handles chunked component streaming correctly', async () => {
    const { rerender } = render(
      <SimpleLivePreview
        registry={registry}
        streamingStates={streamingStates}
        setStreamingStates={setStreamingStates}
        onShowCode={onShowCode}
      />
    );

    const multiPartCode = `
      export default function MultiPart() {
        return <div data-testid="multi-part">Hello, streaming! This is chunked code</div>;
      }
    `;

    // Dispatch chunked component data
    await act(async () => {
      dispatchStreamDeltaEvent({
        componentId: 'multi-part',
        componentName: 'MultiPart',
        code: multiPartCode.slice(0, 50)
      });

      dispatchStreamDeltaEvent({
        componentId: 'multi-part',
        componentName: 'MultiPart',
        code: multiPartCode.slice(50)
      });

      // Update registry with complete code
      registry.components.set('multi-part', {
        name: 'MultiPart',
        code: multiPartCode,
        position: 'main',
        isComplete: true
      });

      // Update streaming states
      setStreamingStates(new Map([
        ['multi-part', {
          isStreaming: false,
          isComplete: true,
          error: null
        }]
      ]));

      window.dispatchEvent(new CustomEvent('content_block_stop', {
        detail: {
          type: 'content_block_stop',
          metadata: { componentId: 'multi-part' }
        }
      }));

      window.dispatchEvent(new CustomEvent('message_stop', {
        detail: { type: 'message_stop' }
      }));

      // Wait for state updates
      await waitForStateUpdate();
    });

    // Re-render to trigger updates
    rerender(
      <SimpleLivePreview
        registry={registry}
        streamingStates={streamingStates}
        setStreamingStates={setStreamingStates}
        onShowCode={onShowCode}
      />
    );

    // Wait for component to update
    await waitFor(() => {
      expect(screen.getByTestId('live-provider')).toBeInTheDocument();
      expect(screen.getByTestId('live-preview-container')).toBeInTheDocument();
      expect(screen.getByTestId('live-preview')).toBeInTheDocument();
    });
  });

  it('handles compound components with dependencies', async () => {
    const { rerender } = render(
      <SimpleLivePreview
        registry={registry}
        streamingStates={streamingStates}
        setStreamingStates={setStreamingStates}
        onShowCode={onShowCode}
      />
    );

    const navCode = `
      export default function Navigation() {
        return (
          <nav data-testid="nav-component" className="p-4 bg-white shadow">
            <div className="flex items-center justify-between">
              <Logo />
              <div className="flex gap-4">
                <NavButton>Home</NavButton>
                <NavButton>About</NavButton>
              </div>
            </div>
          </nav>
        );
      }
    `;

    const navButtonCode = `
      export default function NavButton({ children }) {
        return (
          <button data-testid="nav-button" className="px-3 py-1 text-gray-600 hover:text-gray-900">
            {children}
          </button>
        );
      }
    `;

    const logoCode = `
      export default function Logo() {
        return <div data-testid="logo" className="text-xl font-bold">Brand</div>;
      }
    `;

    // Dispatch component data
    await act(async () => {
      dispatchStreamDeltaEvent({
        componentId: 'comp_nav',
        componentName: 'Navigation',
        code: navCode,
        position: 'header'
      });

      dispatchStreamDeltaEvent({
        componentId: 'comp_navbutton',
        componentName: 'NavButton',
        code: navButtonCode,
        position: 'header'
      });

      dispatchStreamDeltaEvent({
        componentId: 'comp_logo',
        componentName: 'Logo',
        code: logoCode,
        position: 'header'
      });

      // Update registry
      registry.components.set('comp_nav', {
        name: 'Navigation',
        code: navCode,
        position: 'header',
        isComplete: true
      });

      registry.components.set('comp_navbutton', {
        name: 'NavButton',
        code: navButtonCode,
        position: 'header',
        isComplete: true
      });

      registry.components.set('comp_logo', {
        name: 'Logo',
        code: logoCode,
        position: 'header',
        isComplete: true
      });

      // Update streaming states
      setStreamingStates(new Map([
        ['comp_nav', {
          isStreaming: false,
          isComplete: true,
          error: null
        }],
        ['comp_navbutton', {
          isStreaming: false,
          isComplete: true,
          error: null
        }],
        ['comp_logo', {
          isStreaming: false,
          isComplete: true,
          error: null
        }]
      ]));

      window.dispatchEvent(new CustomEvent('content_block_stop', {
        detail: {
          type: 'content_block_stop',
          metadata: { componentId: 'comp_nav' }
        }
      }));

      window.dispatchEvent(new CustomEvent('content_block_stop', {
        detail: {
          type: 'content_block_stop',
          metadata: { componentId: 'comp_navbutton' }
        }
      }));

      window.dispatchEvent(new CustomEvent('content_block_stop', {
        detail: {
          type: 'content_block_stop',
          metadata: { componentId: 'comp_logo' }
        }
      }));

      window.dispatchEvent(new CustomEvent('message_stop', {
        detail: { type: 'message_stop' }
      }));

      // Wait for state updates
      await waitForStateUpdate();
    });

    // Re-render to trigger updates
    rerender(
      <SimpleLivePreview
        registry={registry}
        streamingStates={streamingStates}
        setStreamingStates={setStreamingStates}
        onShowCode={onShowCode}
      />
    );

    // Wait for component to update
    await waitFor(() => {
      expect(screen.getByTestId('live-provider')).toBeInTheDocument();
      expect(screen.getByTestId('live-preview-container')).toBeInTheDocument();
      expect(screen.getByTestId('live-preview')).toBeInTheDocument();
    });
  });
});

describe('LivePreview SSE Integration Tests', () => {
  let registry;
  let streamingStates;
  let setStreamingStates;
  let onShowCode;
  
  beforeEach(() => {
    registry = {
      components: new Map(),
      layout: { sections: { header: [], main: [], footer: [] } }
    };
    streamingStates = new Map();
    setStreamingStates = jest.fn((updater) => {
      if (typeof updater === 'function') {
        streamingStates = updater(streamingStates);
      } else {
        streamingStates = updater;
      }
    });
    onShowCode = jest.fn();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  const dispatchStreamDeltaEvent = (data) => {
    const event = new CustomEvent('stream_delta', {
      detail: {
        type: 'content_block_delta',
        metadata: {
          componentId: data.componentId,
          componentName: data.componentName,
          position: data.position || 'main',
          isCompoundComplete: data.isCompoundComplete || true,
          isCritical: data.isCritical || false
        },
        delta: {
          text: data.code
        }
      }
    });
    window.dispatchEvent(event);
  };

  // Helper to wait for state updates
  const waitForStateUpdate = () => new Promise(resolve => setTimeout(resolve, 0));

  it('renders two streamed components (Header, HeroSection) end-to-end', async () => {
    const headerCode = `
      export default function Header() {
        return <header data-testid="header-component"><h1>Header Content</h1></header>;
      }
    `;

    const heroCode = `
      export default function HeroSection() {
        return <section data-testid="hero-section">Hero content</section>;
      }
    `;

    const { rerender } = render(
      <SimpleLivePreview
        registry={registry}
        streamingStates={streamingStates}
        setStreamingStates={setStreamingStates}
        onShowCode={onShowCode}
      />
    );

    // Dispatch component data
    await act(async () => {
      dispatchStreamDeltaEvent({
        componentId: 'comp_header',
        componentName: 'Header',
        code: headerCode,
        position: 'header'
      });

      dispatchStreamDeltaEvent({
        componentId: 'comp_hero',
        componentName: 'HeroSection',
        code: heroCode,
        position: 'main'
      });

      // Update registry
      registry.components.set('comp_header', {
        name: 'Header',
        code: headerCode,
        position: 'header',
        isComplete: true
      });

      registry.components.set('comp_hero', {
        name: 'HeroSection',
        code: heroCode,
        position: 'main',
        isComplete: true
      });

      // Update streaming states
      setStreamingStates(new Map([
        ['comp_header', {
          isStreaming: false,
          isComplete: true,
          error: null
        }],
        ['comp_hero', {
          isStreaming: false,
          isComplete: true,
          error: null
        }]
      ]));

      window.dispatchEvent(new CustomEvent('content_block_stop', {
        detail: {
          type: 'content_block_stop',
          metadata: { componentId: 'comp_header' }
        }
      }));

      window.dispatchEvent(new CustomEvent('content_block_stop', {
        detail: {
          type: 'content_block_stop',
          metadata: { componentId: 'comp_hero' }
        }
      }));

      window.dispatchEvent(new CustomEvent('message_stop', {
        detail: { type: 'message_stop' }
      }));

      // Wait for state updates
      await waitForStateUpdate();
    });

    // Re-render to trigger updates
    rerender(
      <SimpleLivePreview
        registry={registry}
        streamingStates={streamingStates}
        setStreamingStates={setStreamingStates}
        onShowCode={onShowCode}
      />
    );

    // Wait for component to update
    await waitFor(() => {
      expect(screen.getByTestId('live-provider')).toBeInTheDocument();
      expect(screen.getByTestId('live-preview-container')).toBeInTheDocument();
      expect(screen.getByTestId('live-preview')).toBeInTheDocument();
    });
  });

  it('handles errors in SSE data gracefully', async () => {
    const { rerender } = render(
      <SimpleLivePreview
        registry={registry}
        streamingStates={streamingStates}
        setStreamingStates={setStreamingStates}
        onShowCode={onShowCode}
      />
    );

    // Dispatch invalid code that will cause a transform error
    await act(async () => {
      const invalidCode = `
        export default function ErrorComponent() {
          return <div> {(() => { throw new Error('Test error'); })())} </div>;
        }
      `;

      dispatchStreamDeltaEvent({
        componentId: 'error-component',
        componentName: 'ErrorComponent',
        code: invalidCode,
        position: 'main'
      });

      // Update registry with invalid code
      registry.components.set('error-component', {
        name: 'ErrorComponent',
        code: invalidCode,
        position: 'main',
        isComplete: true
      });

      // Update streaming states
      setStreamingStates(new Map([
        ['error-component', {
          isStreaming: false,
          isComplete: true,
          error: null
        }]
      ]));

      window.dispatchEvent(new CustomEvent('content_block_stop', {
        detail: {
          type: 'content_block_stop',
          metadata: { componentId: 'error-component' }
        }
      }));

      window.dispatchEvent(new CustomEvent('message_stop', {
        detail: { type: 'message_stop' }
      }));

      // Wait for state updates
      await waitForStateUpdate();
    });

    // Re-render to trigger updates
    rerender(
      <SimpleLivePreview
        registry={registry}
        streamingStates={streamingStates}
        setStreamingStates={setStreamingStates}
        onShowCode={onShowCode}
      />
    );

    // Wait for error to be displayed
    await waitFor(() => {
      const errorElements = screen.queryAllByTestId('live-error');
      expect(errorElements.length).toBeGreaterThan(0);
      expect(errorElements[0]).toHaveTextContent('Test error');
    });
  });

  it('handles compound components with dependencies', async () => {
    const { rerender } = render(
      <SimpleLivePreview
        registry={registry}
        streamingStates={streamingStates}
        setStreamingStates={setStreamingStates}
        onShowCode={onShowCode}
      />
    );

    const navCode = `
      export default function Navigation() {
        return (
          <nav data-testid="nav-component" className="p-4 bg-white shadow">
            <div className="flex items-center justify-between">
              <Logo />
              <div className="flex gap-4">
                <NavButton>Home</NavButton>
                <NavButton>About</NavButton>
              </div>
            </div>
          </nav>
        );
      }
    `;

    const navButtonCode = `
      export default function NavButton({ children }) {
        return (
          <button data-testid="nav-button" className="px-3 py-1 text-gray-600 hover:text-gray-900">
            {children}
          </button>
        );
      }
    `;

    const logoCode = `
      export default function Logo() {
        return <div data-testid="logo" className="text-xl font-bold">Brand</div>;
      }
    `;

    // Dispatch component data
    await act(async () => {
      dispatchStreamDeltaEvent({
        componentId: 'comp_nav',
        componentName: 'Navigation',
        code: navCode,
        position: 'header'
      });

      dispatchStreamDeltaEvent({
        componentId: 'comp_navbutton',
        componentName: 'NavButton',
        code: navButtonCode,
        position: 'header'
      });

      dispatchStreamDeltaEvent({
        componentId: 'comp_logo',
        componentName: 'Logo',
        code: logoCode,
        position: 'header'
      });

      // Update registry
      registry.components.set('comp_nav', {
        name: 'Navigation',
        code: navCode,
        position: 'header',
        isComplete: true
      });

      registry.components.set('comp_navbutton', {
        name: 'NavButton',
        code: navButtonCode,
        position: 'header',
        isComplete: true
      });

      registry.components.set('comp_logo', {
        name: 'Logo',
        code: logoCode,
        position: 'header',
        isComplete: true
      });

      // Update streaming states
      setStreamingStates(new Map([
        ['comp_nav', {
          isStreaming: false,
          isComplete: true,
          error: null
        }],
        ['comp_navbutton', {
          isStreaming: false,
          isComplete: true,
          error: null
        }],
        ['comp_logo', {
          isStreaming: false,
          isComplete: true,
          error: null
        }]
      ]));

      window.dispatchEvent(new CustomEvent('content_block_stop', {
        detail: {
          type: 'content_block_stop',
          metadata: { componentId: 'comp_nav' }
        }
      }));

      window.dispatchEvent(new CustomEvent('content_block_stop', {
        detail: {
          type: 'content_block_stop',
          metadata: { componentId: 'comp_navbutton' }
        }
      }));

      window.dispatchEvent(new CustomEvent('content_block_stop', {
        detail: {
          type: 'content_block_stop',
          metadata: { componentId: 'comp_logo' }
        }
      }));

      window.dispatchEvent(new CustomEvent('message_stop', {
        detail: { type: 'message_stop' }
      }));

      // Wait for state updates
      await waitForStateUpdate();
    });

    // Re-render to trigger updates
    rerender(
      <SimpleLivePreview
        registry={registry}
        streamingStates={streamingStates}
        setStreamingStates={setStreamingStates}
        onShowCode={onShowCode}
      />
    );

    // Wait for component to update
    await waitFor(() => {
      expect(screen.getByTestId('live-provider')).toBeInTheDocument();
      expect(screen.getByTestId('live-preview-container')).toBeInTheDocument();
      expect(screen.getByTestId('live-preview')).toBeInTheDocument();
    });
  });
});

describe('Babel Transformations Tests', () => {
  it('should transform JSX to React.createElement calls', () => {
    const input = `
      function Button() {
        return <button className="test">Click me</button>;
      }
    `;
    const transformed = transform(input, {
      presets: ['react'],
      plugins: [
        ['transform-react-jsx', {
          useBuiltIns: true,
          pragma: 'React.createElement',
          pragmaFrag: 'React.Fragment'
        }]
      ]
    }).code;
    expect(transformed).toContain('React.createElement');
    expect(transformed).toContain('className: "test"');
    expect(transformed).toContain('"Click me"');
  });

  it('should handle complex JSX with nested components', () => {
    const input = `
      function Card({ children }) {
        return (
          <div className={cn("card", "p-4")}>
            <Button>Click</Button>
            {children}
          </div>
        );
      }
    `;
    const transformed = transform(input, {
      presets: ['react'],
      plugins: [
        ['transform-react-jsx', {
          useBuiltIns: true,
          pragma: 'React.createElement',
          pragmaFrag: 'React.Fragment'
        }]
      ]
    }).code;
    expect(transformed).toContain('React.createElement("div"');
    expect(transformed).toContain('React.createElement(Button');
    expect(transformed).toContain('cn("card", "p-4")');
  });

  it('should handle streaming incomplete code', () => {
    const input = `
      function Header() {
        return <header className="p-4
    `;
    const transformed = cleanCode(input);
    // The code should be preserved as-is since it's incomplete
    expect(transformed).toContain('function Header()');
    expect(transformed).toContain('return <header className="p-4');
  });

  it('should handle components with event handlers', () => {
    const input = `
      function InteractiveButton() {
        const handleClick = () => console.log('clicked');
        return <button onClick={handleClick}>Click me</button>;
      }
    `;
    const transformed = transform(input, {
      presets: ['react'],
      plugins: [
        ['transform-react-jsx', {
          useBuiltIns: true,
          pragma: 'React.createElement',
          pragmaFrag: 'React.Fragment'
        }]
      ]
    }).code;
    expect(transformed).toContain('React.createElement');
    expect(transformed).toContain('onClick');
    expect(transformed).toContain('handleClick');
  });

  it('should handle components with dynamic expressions', () => {
    const input = `
      function DynamicContent({ items }) {
        return (
          <div>
            {items.map(item => (
              <span key={item.id}>{item.name}</span>
            ))}
          </div>
        );
      }
    `;
    const transformed = transform(input, {
      presets: ['react'],
      plugins: [
        ['transform-react-jsx', {
          useBuiltIns: true,
          pragma: 'React.createElement',
          pragmaFrag: 'React.Fragment'
        }]
      ]
    }).code;
    expect(transformed).toContain('React.createElement');
    expect(transformed).toContain('items.map');
    expect(transformed).toContain('key:');
  });

  it('should handle components with conditional rendering', () => {
    const input = `
      function ConditionalComponent({ isVisible }) {
        return (
          <div>
            {isVisible && <span>Visible content</span>}
            {isVisible ? <p>True case</p> : <p>False case</p>}
          </div>
        );
      }
    `;
    const transformed = transform(input, {
      presets: ['react'],
      plugins: [
        ['transform-react-jsx', {
          useBuiltIns: true,
          pragma: 'React.createElement',
          pragmaFrag: 'React.Fragment'
        }]
      ]
    }).code;
    expect(transformed).toContain('React.createElement');
    expect(transformed).toContain('isVisible &&');
    expect(transformed).toContain('isVisible ?');
  });

  it('should handle components with fragments', () => {
    const input = `
      function FragmentComponent() {
        return (
          <>
            <div>First</div>
            <div>Second</div>
          </>
        );
      }
    `;
    const transformed = transform(input, {
      presets: ['react'],
      plugins: [
        ['transform-react-jsx', {
          useBuiltIns: true,
          pragma: 'React.createElement',
          pragmaFrag: 'React.Fragment'
        }]
      ]
    }).code;
    expect(transformed).toContain('React.Fragment');
    expect(transformed).toContain('First');
    expect(transformed).toContain('Second');
  });

  it('should handle components with style objects', () => {
    const input = `
      function StyledComponent() {
        return (
          <div style={{ color: 'red', padding: '1rem' }}>
            Styled content
          </div>
        );
      }
    `;
    const transformed = transform(input, {
      presets: ['react'],
      plugins: [
        ['transform-react-jsx', {
          useBuiltIns: true,
          pragma: 'React.createElement',
          pragmaFrag: 'React.Fragment'
        }]
      ]
    }).code;
    expect(transformed).toContain('React.createElement');
    expect(transformed).toContain('style:');
    expect(transformed).toContain('color:');
    expect(transformed).toContain('padding:');
  });
}); 
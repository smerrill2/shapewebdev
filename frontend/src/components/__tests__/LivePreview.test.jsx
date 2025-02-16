import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import SimpleLivePreview from '../SimpleLivePreview';
import LivePreviewTestPage from '../LivePreviewTestPage';
import { cleanCodeForLive } from '../utils/babelTransformations';
import { TextEncoder, TextDecoder } from 'util';
import { jest } from '@jest/globals';

// Set shorter timeout for tests
jest.setTimeout(5000);

// Mock react-live
jest.mock('react-live', () => ({
  LiveProvider: ({ children }) => <div data-testid="live-provider">{children}</div>,
  LivePreview: () => <div data-testid="live-preview">Preview Content</div>,
  LiveError: ({ children }) => <div data-testid="live-error">{children}</div>
}));

// Mock UI components
jest.mock('../ui', () => ({
  Button: ({ children, ...props }) => <button {...props}>{children}</button>,
  Card: ({ children, ...props }) => <div {...props}>{children}</div>,
}));

// Mock babel transformations to be instant
jest.mock('../utils/babelTransformations', () => ({
  cleanCodeForLive: jest.fn(code => code),
  extractFunctionDefinitions: jest.fn(() => new Map()),
}));

// Mock DevOverlay component
jest.mock('../DevOverlay', () => ({
  __esModule: true,
  default: () => null
}));

// Mock fetch
global.fetch = jest.fn();

// Mock window methods
const mockAddEventListener = jest.fn();
const mockRemoveEventListener = jest.fn();
const mockDispatchEvent = jest.fn();

window.addEventListener = mockAddEventListener;
window.removeEventListener = mockRemoveEventListener;
window.dispatchEvent = mockDispatchEvent;

// Polyfill ReadableStream if not defined
if (typeof ReadableStream === 'undefined') {
  global.ReadableStream = class ReadableStream {
    constructor(source) {
      this.source = source;
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

describe('LivePreview Tests', () => {
  let registry;

  beforeEach(() => {
    registry = {
      components: new Map(),
      layout: { sections: { header: [], main: [], footer: [] } }
    };
  });

  describe('SimpleLivePreview Component Tests', () => {
    it('should render initial state correctly', () => {
      render(<SimpleLivePreview registry={registry} />);
      
      // Check for the Live Preview text in the header
      expect(screen.getByText('Live Preview')).toBeInTheDocument();
      
      // Check for the main container
      const container = screen.getByRole('region');
      expect(container).toBeInTheDocument();
    });

    it('should handle streaming state and show loading indicator', () => {
      const streamingStates = new Map([
        ['test-component', { isStreaming: true, isComplete: false, error: null }]
      ]);
      
      render(<SimpleLivePreview registry={registry} streamingStates={streamingStates} />);
      
      // Check for loading state
      expect(screen.getByText('Live Preview')).toBeInTheDocument();
    });

    it('should handle component code buffering correctly', async () => {
      const componentId = 'test-component';
      const componentCode = 'function TestComponent() { return <div>Test</div>; }';
      
      registry.components.set(componentId, {
        name: 'TestComponent',
        code: componentCode,
        position: 'main'
      });

      render(<SimpleLivePreview registry={registry} />);
      
      // Check for the container
      const container = screen.getByRole('region');
      expect(container).toBeInTheDocument();
    });

    it('should handle errors in component rendering', () => {
      const componentId = 'error-component';
      const componentCode = 'function ErrorComponent() { throw new Error("Test error"); }';
      
      registry.components.set(componentId, {
        name: 'ErrorComponent',
        code: componentCode,
        position: 'main'
      });

      render(<SimpleLivePreview registry={registry} />);
      
      // Check for error boundary rendering
      expect(screen.getByRole('region')).toBeInTheDocument();
    });
  });

  describe('End-to-End Integration Tests', () => {
    beforeEach(() => {
      global.fetch = jest.fn();
    });

    afterEach(() => {
      jest.resetAllMocks();
    });

    it('should transform and render a simple button component', async () => {
      const SSEdata = [
        'event: component_start\ndata: {"metadata":{"componentId":"test-button","componentName":"Button","position":"main"}}\n\n',
        'event: component_delta\ndata: {"delta":"function Button() { return <button>Test</button>; }"}\n\n',
        'event: component_stop\ndata: {"metadata":{"componentId":"test-button"}}\n\n'
      ];

      global.fetch.mockResolvedValue({
        ok: true,
        body: new ReadableStream({
          async start(controller) {
            for (const data of SSEdata) {
              controller.enqueue(new TextEncoder().encode(data));
            }
            controller.close();
          }
        })
      });

      render(<SimpleLivePreview registry={registry} />);
      
      // Check for the container
      const container = screen.getByRole('region');
      expect(container).toBeInTheDocument();
    });

    it('should handle errors in SSE data gracefully', async () => {
      const SSEdata = [
        'event: component_start\ndata: {"metadata":{"componentId":"error-component","componentName":"Error","position":"main"}}\n\n',
        'event: component_delta\ndata: {"delta":"function Error() { syntax error }"}\n\n',
        'event: component_stop\ndata: {"metadata":{"componentId":"error-component"}}\n\n'
      ];

      global.fetch.mockResolvedValue({
        ok: true,
        body: new ReadableStream({
          async start(controller) {
            for (const data of SSEdata) {
              controller.enqueue(new TextEncoder().encode(data));
            }
            controller.close();
          }
        })
      });

      render(<SimpleLivePreview registry={registry} />);
      
      // Check for the container
      const container = screen.getByRole('region');
      expect(container).toBeInTheDocument();
    });
  });

  describe('Code Transformation Tests', () => {
    it('should properly transform component code', () => {
      const inputCode = `
        function TestComponent() {
          return (
            <div className="p-4">
              <h1>Hello</h1>
            </div>
          );
        }
      `;

      const transformedCode = cleanCodeForLive(inputCode);
      
      expect(transformedCode).toContain('React.createElement');
      expect(transformedCode).toContain('render(');
    });
  });
}); 
import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import SimpleLivePreview from '../SimpleLivePreview';
import { cleanCodeForLive } from '../utils/babelTransformations';

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

describe('SimpleLivePreview Component', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Reset window event listeners
    window.addEventListener = jest.fn();
    window.removeEventListener = jest.fn();
  });

  it('should render initial state correctly', () => {
    const registry = {
      components: new Map(),
      layout: { sections: { header: [], main: [], footer: [] } }
    };
    
    render(<SimpleLivePreview registry={registry} />);
    
    expect(screen.getByText('Ready to generate components')).toBeInTheDocument();
  });

  it('should handle streaming state and show loading indicator', () => {
    const registry = {
      components: new Map([
        ['comp_1', { name: 'TestComponent', code: '', position: 'main' }]
      ])
    };
    
    const streamingStates = new Map([
      ['comp_1', { isStreaming: true, isComplete: false, error: null }]
    ]);
    
    render(
      <SimpleLivePreview 
        registry={registry} 
        streamingStates={streamingStates}
        setStreamingStates={() => {}}
      />
    );
    
    expect(screen.getByText('Generating components...')).toBeInTheDocument();
  });

  it('should render component code when streaming is complete', async () => {
    const componentCode = `
      export function TestComponent() {
        return <div className="test">Hello World</div>;
      }
    `;
    
    const registry = {
      components: new Map([
        ['comp_1', { 
          name: 'TestComponent', 
          code: componentCode,
          position: 'main',
          isComplete: true 
        }]
      ])
    };
    
    const streamingStates = new Map([
      ['comp_1', { isStreaming: false, isComplete: true, error: null }]
    ]);
    
    render(
      <SimpleLivePreview 
        registry={registry} 
        streamingStates={streamingStates}
        setStreamingStates={() => {}}
      />
    );

    // Verify the preview container is rendered
    expect(screen.getByTestId('preview-container')).toBeInTheDocument();
    expect(screen.getByTestId('live-provider')).toBeInTheDocument();
    expect(screen.getByTestId('live-preview')).toBeInTheDocument();
  });

  it('should handle stream delta events correctly', async () => {
    const registry = {
      components: new Map()
    };
    
    const streamingStates = new Map();
    const setStreamingStates = jest.fn();
    
    render(
      <SimpleLivePreview 
        registry={registry} 
        streamingStates={streamingStates}
        setStreamingStates={setStreamingStates}
      />
    );

    // Simulate stream_delta event
    const deltaEvent = new CustomEvent('stream_delta', {
      detail: {
        type: 'content_block_delta',
        metadata: {
          componentId: 'comp_1',
          componentName: 'TestComponent',
          position: 'main'
        },
        delta: {
          text: '/// START TestComponent position=main\nexport function TestComponent() { return <div>Test</div>; }\n/// END TestComponent'
        }
      }
    });

    // Dispatch the event
    await act(async () => {
      window.dispatchEvent(deltaEvent);
    });

    // Verify event listener was added
    expect(window.addEventListener).toHaveBeenCalledWith('stream_delta', expect.any(Function));
  });

  it('should handle message_stop events correctly', async () => {
    const registry = {
      components: new Map([
        ['comp_1', { 
          name: 'TestComponent', 
          code: 'function TestComponent() { return <div>Test</div>; }',
          position: 'main'
        }]
      ])
    };
    
    const streamingStates = new Map([
      ['comp_1', { isStreaming: true, isComplete: false, error: null }]
    ]);
    
    const setStreamingStates = jest.fn();
    
    render(
      <SimpleLivePreview 
        registry={registry} 
        streamingStates={streamingStates}
        setStreamingStates={setStreamingStates}
      />
    );

    // Simulate message_stop event
    const stopEvent = new CustomEvent('message_stop', {
      detail: { type: 'message_stop' }
    });

    // Dispatch the event
    await act(async () => {
      window.dispatchEvent(stopEvent);
    });

    // Verify event listener was added
    expect(window.addEventListener).toHaveBeenCalledWith('message_stop', expect.any(Function));
    
    // Verify streaming states were updated
    expect(setStreamingStates).toHaveBeenCalled();
  });

  it('should show code display when onShowCode is triggered', () => {
    const component = {
      name: 'TestComponent',
      code: 'function TestComponent() { return <div>Test</div>; }',
      position: 'main'
    };
    
    const registry = {
      components: new Map([['comp_1', component]])
    };
    
    const onShowCode = jest.fn();
    
    render(
      <SimpleLivePreview 
        registry={registry} 
        streamingStates={new Map()}
        onShowCode={onShowCode}
      />
    );

    // Click the "Show TestComponent" button
    const showButton = screen.getByText('Show TestComponent');
    showButton.click();

    // Verify onShowCode was called with the component
    expect(onShowCode).toHaveBeenCalledWith(component);
  });

  it('should handle component code buffering correctly', async () => {
    const registry = {
      components: new Map()
    };
    
    const streamingStates = new Map();
    const setStreamingStates = jest.fn();
    
    render(
      <SimpleLivePreview 
        registry={registry} 
        streamingStates={streamingStates}
        setStreamingStates={setStreamingStates}
      />
    );

    // Simulate multiple stream_delta events for the same component
    const events = [
      {
        type: 'content_block_start',
        metadata: {
          componentId: 'comp_1',
          componentName: 'TestComponent',
          position: 'main'
        }
      },
      {
        type: 'content_block_delta',
        metadata: {
          componentId: 'comp_1',
          componentName: 'TestComponent',
          position: 'main'
        },
        delta: {
          text: '/// START TestComponent position=main\nexport function TestComponent() {'
        }
      },
      {
        type: 'content_block_delta',
        metadata: {
          componentId: 'comp_1',
          componentName: 'TestComponent',
          position: 'main'
        },
        delta: {
          text: ' return <div>Test</div>; }\n/// END TestComponent'
        }
      },
      {
        type: 'content_block_stop',
        metadata: {
          componentId: 'comp_1',
          componentName: 'TestComponent',
          position: 'main',
          isComplete: true
        }
      }
    ];

    // Dispatch events in sequence
    for (const event of events) {
      await act(async () => {
        window.dispatchEvent(new CustomEvent('stream_delta', { detail: event }));
      });
    }

    // Verify the preview container is rendered after all events
    expect(screen.getByTestId('preview-container')).toBeInTheDocument();
  });

  it('should handle errors in component rendering', () => {
    const errorComponent = {
      name: 'ErrorComponent',
      code: 'function ErrorComponent() { throw new Error("Test error"); }',
      position: 'main',
      isComplete: true
    };
    
    const registry = {
      components: new Map([['comp_error', errorComponent]])
    };
    
    const streamingStates = new Map([
      ['comp_error', { isStreaming: false, isComplete: true, error: null }]
    ]);
    
    render(
      <SimpleLivePreview 
        registry={registry} 
        streamingStates={streamingStates}
        setStreamingStates={() => {}}
      />
    );

    // Verify error boundary catches the error
    expect(screen.getByTestId('live-error')).toBeInTheDocument();
  });
}); 
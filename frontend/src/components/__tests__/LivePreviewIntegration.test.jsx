import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import LivePreviewTestPage from '../LivePreviewTestPage';
import { cleanCodeForLive } from '../utils/babelTransformations';

// Mock fetch for SSE simulation
global.fetch = jest.fn();

// Mock TextEncoder/TextDecoder if not available in test environment
if (typeof TextEncoder === 'undefined') {
  global.TextEncoder = require('util').TextEncoder;
}
if (typeof TextDecoder === 'undefined') {
  global.TextDecoder = require('util').TextDecoder;
}

// Mock ReadableStream if not available
if (typeof ReadableStream === 'undefined') {
  global.ReadableStream = require('stream/web').ReadableStream;
}

describe('LivePreview Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should transform and render a simple button component from SSE data', async () => {
    // 1. Prepare SSE data that simulates backend streaming
    const SSEdata = [
      `data: ${JSON.stringify({
        type: 'content_block_start',
        metadata: {
          componentId: 'comp_button',
          componentName: 'Button',
          position: 'main',
          isCompoundComplete: true,
          isCritical: false,
        },
      })}\n\n`,
      `data: ${JSON.stringify({
        type: 'content_block_delta',
        metadata: {
          componentId: 'comp_button',
          componentName: 'Button',
          position: 'main',
          isCompoundComplete: true,
          isCritical: false,
        },
        delta: {
          text: '/// START Button position=main\nexport function Button(){ return <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">Click Me</button>;}\n/// END Button\n',
        },
      })}\n\n`,
      `data: ${JSON.stringify({
        type: 'content_block_stop',
        metadata: {
          componentId: 'comp_button',
          componentName: 'Button',
          position: 'main',
          isComplete: true,
          isCompoundComplete: true,
          isCritical: false,
        }
      })}\n\n`,
      `data: ${JSON.stringify({ type: 'message_stop' })}\n\n`
    ];

    // 2. Mock fetch to return a ReadableStream of SSE chunks
    let currentChunk = 0;
    const mockStream = new ReadableStream({
      pull(controller) {
        if (currentChunk < SSEdata.length) {
          const chunk = SSEdata[currentChunk++];
          controller.enqueue(new TextEncoder().encode(chunk));
        } else {
          controller.close();
        }
      }
    });

    global.fetch.mockResolvedValue({
      ok: true,
      body: mockStream,
      headers: new Headers({
        'content-type': 'text/event-stream'
      })
    });

    // 3. Render the LivePreviewTestPage
    render(<LivePreviewTestPage />);

    // 4. Click the "Generate" button to trigger the SSE request
    const generateButton = screen.getByRole('button', { name: /generate/i });
    await act(async () => {
      generateButton.click();
    });

    // 5. Wait for the component to be rendered
    await waitFor(() => {
      // The button should be rendered with the text "Click Me"
      expect(screen.getByText('Click Me')).toBeInTheDocument();
    });

    // 6. Verify the component was properly transformed
    // The component should be in the registry with the correct metadata
    const buttonText = screen.getByText('Click Me');
    expect(buttonText.parentElement).toHaveClass('px-4', 'py-2', 'bg-blue-500', 'text-white', 'rounded', 'hover:bg-blue-600');
  });

  it('should handle a compound component with dependencies', async () => {
    // 1. Prepare SSE data for a compound component (Navigation with nested Button)
    const SSEdata = [
      // Start Navigation component
      `data: ${JSON.stringify({
        type: 'content_block_start',
        metadata: {
          componentId: 'comp_nav',
          componentName: 'Navigation',
          position: 'header',
          isCompoundComplete: false,
          isCritical: true,
        },
      })}\n\n`,
      // Navigation component code
      `data: ${JSON.stringify({
        type: 'content_block_delta',
        metadata: {
          componentId: 'comp_nav',
          componentName: 'Navigation',
          position: 'header',
          isCompoundComplete: false,
          isCritical: true,
        },
        delta: {
          text: '/// START Navigation position=header\nexport function Navigation(){ return <nav className="p-4 bg-white shadow"><div className="flex items-center justify-between"><Logo /><div className="flex gap-4"><NavButton>Home</NavButton><NavButton>About</NavButton></div></div></nav>;}\n/// END Navigation\n',
        },
      })}\n\n`,
      // Start NavButton component
      `data: ${JSON.stringify({
        type: 'content_block_start',
        metadata: {
          componentId: 'comp_navbutton',
          componentName: 'NavButton',
          position: 'header',
          isCompoundComplete: true,
          isCritical: false,
        },
      })}\n\n`,
      // NavButton component code
      `data: ${JSON.stringify({
        type: 'content_block_delta',
        metadata: {
          componentId: 'comp_navbutton',
          componentName: 'NavButton',
          position: 'header',
          isCompoundComplete: true,
          isCritical: false,
        },
        delta: {
          text: '/// START NavButton position=header\nexport function NavButton({ children }){ return <button className="px-3 py-1 text-gray-600 hover:text-gray-900">{children}</button>;}\n/// END NavButton\n',
        },
      })}\n\n`,
      // Stop NavButton component
      `data: ${JSON.stringify({
        type: 'content_block_stop',
        metadata: {
          componentId: 'comp_navbutton',
          componentName: 'NavButton',
          position: 'header',
          isComplete: true,
          isCompoundComplete: true,
          isCritical: false,
        }
      })}\n\n`,
      // Start Logo component
      `data: ${JSON.stringify({
        type: 'content_block_start',
        metadata: {
          componentId: 'comp_logo',
          componentName: 'Logo',
          position: 'header',
          isCompoundComplete: true,
          isCritical: false,
        },
      })}\n\n`,
      // Logo component code
      `data: ${JSON.stringify({
        type: 'content_block_delta',
        metadata: {
          componentId: 'comp_logo',
          componentName: 'Logo',
          position: 'header',
          isCompoundComplete: true,
          isCritical: false,
        },
        delta: {
          text: '/// START Logo position=header\nexport function Logo(){ return <div className="text-xl font-bold">Brand</div>;}\n/// END Logo\n',
        },
      })}\n\n`,
      // Stop Logo component
      `data: ${JSON.stringify({
        type: 'content_block_stop',
        metadata: {
          componentId: 'comp_logo',
          componentName: 'Logo',
          position: 'header',
          isComplete: true,
          isCompoundComplete: true,
          isCritical: false,
        }
      })}\n\n`,
      // Stop Navigation component
      `data: ${JSON.stringify({
        type: 'content_block_stop',
        metadata: {
          componentId: 'comp_nav',
          componentName: 'Navigation',
          position: 'header',
          isComplete: true,
          isCompoundComplete: true,
          isCritical: true,
        }
      })}\n\n`,
      // End message
      `data: ${JSON.stringify({ type: 'message_stop' })}\n\n`
    ];

    // 2. Mock fetch to return the SSE stream
    let currentChunk = 0;
    const mockStream = new ReadableStream({
      pull(controller) {
        if (currentChunk < SSEdata.length) {
          const chunk = SSEdata[currentChunk++];
          controller.enqueue(new TextEncoder().encode(chunk));
        } else {
          controller.close();
        }
      }
    });

    global.fetch.mockResolvedValue({
      ok: true,
      body: mockStream,
      headers: new Headers({
        'content-type': 'text/event-stream'
      })
    });

    // 3. Render the LivePreviewTestPage
    render(<LivePreviewTestPage />);

    // 4. Click the "Generate" button
    const generateButton = screen.getByRole('button', { name: /generate/i });
    await act(async () => {
      generateButton.click();
    });

    // 5. Wait for all components to be rendered
    await waitFor(() => {
      // Logo should be rendered
      expect(screen.getByText('Brand')).toBeInTheDocument();
      // Navigation buttons should be rendered
      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('About')).toBeInTheDocument();
    });

    // 6. Verify component structure and styling
    const logo = screen.getByText('Brand');
    expect(logo).toHaveClass('text-xl', 'font-bold');

    const homeButton = screen.getByText('Home');
    expect(homeButton).toHaveClass('px-3', 'py-1', 'text-gray-600', 'hover:text-gray-900');

    const aboutButton = screen.getByText('About');
    expect(aboutButton).toHaveClass('px-3', 'py-1', 'text-gray-600', 'hover:text-gray-900');
  });

  it('should handle errors in component code gracefully', async () => {
    // 1. Prepare SSE data with a component that has syntax errors
    const SSEdata = [
      `data: ${JSON.stringify({
        type: 'content_block_start',
        metadata: {
          componentId: 'comp_error',
          componentName: 'ErrorComponent',
          position: 'main',
          isCompoundComplete: true,
          isCritical: false,
        },
      })}\n\n`,
      `data: ${JSON.stringify({
        type: 'content_block_delta',
        metadata: {
          componentId: 'comp_error',
          componentName: 'ErrorComponent',
          position: 'main',
          isCompoundComplete: true,
          isCritical: false,
        },
        delta: {
          text: '/// START ErrorComponent position=main\nexport function ErrorComponent(){ return <div className="broken> {syntax error here} </div>;}\n/// END ErrorComponent\n',
        },
      })}\n\n`,
      `data: ${JSON.stringify({
        type: 'content_block_stop',
        metadata: {
          componentId: 'comp_error',
          componentName: 'ErrorComponent',
          position: 'main',
          isComplete: true,
          isCompoundComplete: true,
          isCritical: false,
        }
      })}\n\n`,
      `data: ${JSON.stringify({ type: 'message_stop' })}\n\n`
    ];

    // 2. Mock fetch to return the SSE stream
    let currentChunk = 0;
    const mockStream = new ReadableStream({
      pull(controller) {
        if (currentChunk < SSEdata.length) {
          const chunk = SSEdata[currentChunk++];
          controller.enqueue(new TextEncoder().encode(chunk));
        } else {
          controller.close();
        }
      }
    });

    global.fetch.mockResolvedValue({
      ok: true,
      body: mockStream,
      headers: new Headers({
        'content-type': 'text/event-stream'
      })
    });

    // 3. Render the LivePreviewTestPage
    render(<LivePreviewTestPage />);

    // 4. Click the "Generate" button
    const generateButton = screen.getByRole('button', { name: /generate/i });
    await act(async () => {
      generateButton.click();
    });

    // 5. Wait for error message to be displayed
    await waitFor(() => {
      // Should show an error message or error boundary
      expect(screen.getByTestId('preview-error')).toBeInTheDocument();
    });
  });

  it('should properly transform code through the Babel pipeline', () => {
    // Test the code transformation pipeline directly
    const inputCode = `
      export function TestComponent() {
        return (
          <div className={cn("p-4", "bg-white")}>
            <h1 className="text-xl">Hello</h1>
            {items.map(item => (
              <div key={item.id}>{item.name}</div>
            ))}
          </div>
        );
      }
    `;

    const transformedCode = cleanCodeForLive(inputCode);

    // Verify the transformation
    expect(transformedCode).not.toContain('export');
    expect(transformedCode).toContain('React.createElement');
    expect(transformedCode).toContain('render(');
    expect(transformedCode).not.toContain('className={cn');
  });
}); 
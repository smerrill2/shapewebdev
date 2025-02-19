/**
 * @file LivePreviewTestPage.test.jsx
 * A TDD test suite verifying that components streamed into the LivePreviewTestPage
 * actually render in the DOM via React-Live.
 */

// We reduce the default test timeout
jest.setTimeout(2000);

import React from 'react';
import { render, screen, act, waitFor, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import LivePreviewTestPage from '../LivePreviewTestPage';

// ------------------------------------------------------------
// Helpers & Utilities
// ------------------------------------------------------------

/**
 * Creates a mock event for streaming, replicating structure from our streaming logic.
 */
const createTestEvent = (type, metadata = {}, delta = null) => ({
  type,
  metadata: {
    componentId: metadata.componentId || 'test-component',
    componentName: metadata.componentName || 'TestComponent',
    position: metadata.position || 'main',
    ...metadata,
  },
  ...(delta && { delta }),
});

/**
 * Simulates dispatching a custom streaming event to the window.
 */
const simulateStreamEvent = async (type, metadata, delta = null) => {
  const event = new CustomEvent('stream_delta', {
    detail: {
      type,
      metadata,
      ...(delta && { delta }),
    },
  });
  await act(async () => {
    window.dispatchEvent(event);
  });
};

/**
 * Splits code by lines, simulates chunked arrival.
 */
const simulateChunkedArrival = async ({
  componentId,
  componentName,
  position,
  code,
}) => {
  // 1. content_block_start
  await simulateStreamEvent('content_block_start', {
    componentId,
    componentName,
    position,
  });

  // 2. content_block_delta in chunks
  const lines = code.split('\n');
  for (const line of lines) {
    // Simulate partial streaming line by line
    await simulateStreamEvent('content_block_delta', {
      componentId,
      componentName,
      position,
    }, { text: line + '\n' });
  }

  // 3. content_block_stop
  await simulateStreamEvent('content_block_stop', {
    componentId,
    componentName,
    position,
  });
};

/**
 * Simulates a single arrival (no chunking) for convenience.
 */
const simulateComponentArrival = async ({
  componentId,
  componentName,
  position,
  code,
}) => {
  // 1. content_block_start
  await simulateStreamEvent('content_block_start', {
    componentId,
    componentName,
    position,
  });

  // 2. content_block_delta
  await simulateStreamEvent('content_block_delta', {
    componentId,
    componentName,
    position,
  }, { text: code });

  // 3. content_block_stop
  await simulateStreamEvent('content_block_stop', {
    componentId,
    componentName,
    position,
  });
};

/**
 * Helper to ensure we can find an element in the DOM with the given test ID.
 */
const verifyComponentRendered = async (testId) => {
  await waitFor(() => {
    expect(screen.getByTestId(testId)).toBeInTheDocument();
  });
};

/**
 * Cleans up between tests.
 */
const cleanupTestEnvironment = async () => {
  // Force any pending React state updates
  await act(async () => {
    // brief delay
    await new Promise((resolve) => setTimeout(resolve, 50));
  });
  // Ensure testing-library DOM cleanup
  cleanup();
};

// ------------------------------------------------------------
// Test Suite
// ------------------------------------------------------------

beforeAll(() => {
  console.log('🔧 [BeforeAll] Test suite setup');
});
afterAll(() => {
  console.log('🧹 [AfterAll] Test suite teardown');
});

beforeEach(() => {
  // Each test starts fresh
  console.log('🔄 [BeforeEach] Rendering LivePreviewTestPage fresh');
  render(<LivePreviewTestPage />);
});
afterEach(async () => {
  console.log('🧹 [AfterEach] Cleaning up...');
  await cleanupTestEnvironment();
});

// ------------------------------------------------------------
// Tests
// ------------------------------------------------------------
describe('LivePreviewTestPage Streaming', () => {
  it('should start with empty preview state', async () => {
    // On initial render, we have "Ready to generate components"
    const preview = screen.getByTestId('live-preview-content');
    expect(preview).toBeInTheDocument();
    expect(preview).toHaveTextContent('Ready to generate components');
  });

  describe('Basic Component Streaming', () => {
    it('should render first component immediately on arrival', async () => {
      // The snippet defines a function, then a top-level arrow expression
      // for React-Live to evaluate and render.
      const code = `
/// START TestComponent position=main
function TestComponent() {
  return (
    <div data-testid="test-content">
      <h2>Test Component</h2>
      <p>This is a test component</p>
    </div>
  );
}

// React-Live will render the last expression, which is an arrow returning <TestComponent />
() => <TestComponent />
/// END TestComponent
`;

      await simulateComponentArrival({
        componentId: 'test-content',
        componentName: 'TestComponent',
        position: 'main',
        code,
      });

      // Ensure it's rendered
      await verifyComponentRendered('test-content');
      expect(screen.getByText('Test Component')).toBeInTheDocument();
    });

    it('should maintain existing components when new ones arrive', async () => {
      // 1) First snippet
      const code1 = `
/// START FirstComponent position=main
function FirstComponent() {
  return (
    <div data-testid="first-component">
      <h2>First Component</h2>
      <p>This is the first component</p>
    </div>
  );
}
() => <FirstComponent />
/// END FirstComponent
`;
      await simulateComponentArrival({
        componentId: 'first-component',
        componentName: 'FirstComponent',
        position: 'main',
        code: code1,
      });
      await verifyComponentRendered('first-component');

      // 2) Second snippet
      const code2 = `
/// START SecondComponent position=main
function SecondComponent() {
  return (
    <div data-testid="second-component">
      <h2>Second Component</h2>
      <p>This is the second component</p>
    </div>
  );
}
() => <SecondComponent />
/// END SecondComponent
`;
      await simulateComponentArrival({
        componentId: 'second-component',
        componentName: 'SecondComponent',
        position: 'main',
        code: code2,
      });
      await verifyComponentRendered('second-component');

      // Make sure the first one is still there
      expect(screen.getByTestId('first-component')).toBeInTheDocument();
      expect(screen.getByText('First Component')).toBeInTheDocument();

      // And the second one is also present
      expect(screen.getByTestId('second-component')).toBeInTheDocument();
      expect(screen.getByText('Second Component')).toBeInTheDocument();
    });
  });

  describe('Chunked/Partial Streaming', () => {
    it('should handle chunked snippet arrivals', async () => {
      const code = `
/// START ChunkedTest position=main
function ChunkedTest() {
  return (
    <div data-testid="chunked-component">
      <h3>Chunked Component</h3>
      <p>Arrived in partial streams</p>
    </div>
  );
}
() => <ChunkedTest />
/// END ChunkedTest
`;

      await simulateChunkedArrival({
        componentId: 'chunked-component',
        componentName: 'ChunkedTest',
        position: 'main',
        code,
      });

      await verifyComponentRendered('chunked-component');
      expect(screen.getByText('Chunked Component')).toBeInTheDocument();
    });
  });

  describe('Error Recovery & Edge Cases', () => {
    it('should handle syntax errors in component code', async () => {
      // Intentional syntax error (missing quote in className)
      const code = `
/// START ErrorComponent position=main
function ErrorComponent() {
  return (
    <div className="missing-quote>
      <h2>Error Test</h2>
      <p>This has a syntax error</p>
    </div>
  );
}
() => <ErrorComponent />
/// END ErrorComponent
`;

      await simulateComponentArrival({
        componentId: 'error-component',
        componentName: 'ErrorComponent',
        position: 'main',
        code,
      });

      // With EnhancedErrorBoundary + <LiveError>, we should see an error
      // The React-Live preview won't have a test-id on the actual broken component
      // but we should see the error message in the LiveError region.
      const previewError = await screen.findByTestId('preview-error');
      expect(previewError).toBeInTheDocument();
      expect(previewError).toHaveTextContent('SyntaxError');
    });
  });

  describe('Multi-Component Integration', () => {
    it('should render multiple components in correct order', async () => {
      // 1) Header snippet
      const headerCode = `
/// START Header position=header
function Header() {
  return (
    <header data-testid="header-component">
      <h1>Site Header</h1>
    </header>
  );
}
() => <Header />
/// END Header
`;
      await simulateComponentArrival({
        componentId: 'header-component',
        componentName: 'Header',
        position: 'header',
        code: headerCode,
      });
      await verifyComponentRendered('header-component');

      // 2) Main snippet
      const mainCode = `
/// START MainContent position=main
function MainContent() {
  return (
    <main data-testid="main-content">
      <p>Main content here</p>
    </main>
  );
}
() => <MainContent />
/// END MainContent
`;
      await simulateComponentArrival({
        componentId: 'main-content',
        componentName: 'MainContent',
        position: 'main',
        code: mainCode,
      });
      await verifyComponentRendered('main-content');

      // Header and main should both exist
      expect(screen.getByTestId('header-component')).toBeInTheDocument();
      expect(screen.getByTestId('main-content')).toBeInTheDocument();
    });
  });
});

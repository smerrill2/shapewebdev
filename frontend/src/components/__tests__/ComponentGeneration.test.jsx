import { act } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { ReadableStream, WritableStream, TransformStream } from 'web-streams-polyfill';
import GeneratePage from '../../pages/GeneratePage';

// Add TextEncoder polyfill
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Add polyfills to global
global.ReadableStream = ReadableStream;
global.WritableStream = WritableStream;
global.TransformStream = TransformStream;

// Mock SSE response data
const mockMessages = [
  {
    type: 'thought',
    thought: 'Starting component generation',
    sequenceId: 1
  },
  {
    type: 'thought',
    thought: 'Creating a modern hero section',
    sequenceId: 2
  },
  {
    type: 'code',
    code: '/* Component: HeroSection */\nimport React from "react";\nimport { Button } from "@/components/ui/button";\n\nconst HeroSection = () => {\n  return (\n    <div>Hero Section</div>\n  );\n};\n\nexport default HeroSection;',
    isComplete: true,
    metadata: {
      componentName: 'HeroSection'
    },
    sequenceId: 3
  },
  {
    type: 'thought',
    thought: 'Adding a feature grid',
    sequenceId: 4
  },
  {
    type: 'code',
    code: '/* Component: FeatureGrid */\nimport React from "react";\n\nconst FeatureGrid = () => {\n  return (\n    <div>Feature Grid</div>\n  );\n};\n\nexport default FeatureGrid;',
    isComplete: true,
    metadata: {
      componentName: 'FeatureGrid'
    },
    sequenceId: 5
  }
];

const mockErrorMessages = [
  {
    type: 'thought',
    thought: 'Starting component generation',
    sequenceId: 1
  },
  {
    type: 'error',
    error: 'Error generating components',
    sequenceId: 2
  }
];

describe('Component Generation System', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    
    // Mock fetch for successful case
    const mockSuccessStream = new ReadableStream({
      start(controller) {
        mockMessages.forEach(message => {
          controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(message)}\n\n`));
        });
        controller.close();
      }
    });

    // Mock fetch for error case  
    const mockErrorStream = new ReadableStream({
      start(controller) {
        mockErrorMessages.forEach(message => {
          controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(message)}\n\n`));
        });
        controller.close();
      }
    });

    global.fetch = jest.fn((url) => {
      if (url.includes('/api/generate')) {
        if (url.includes('Error test')) {
          return Promise.resolve({
            ok: true,
            body: mockErrorStream,
            headers: new Headers({
              'Content-Type': 'text/event-stream'
            })
          });
        }
        return Promise.resolve({
          ok: true,
          body: mockSuccessStream,
          headers: new Headers({
            'Content-Type': 'text/event-stream'
          })
        });
      }
      return Promise.reject(new Error('Not found'));
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.resetAllMocks();
  });

  test('processes complete component generation flow', async () => {
    render(<GeneratePage />);

    // Fill form and submit
    const promptInput = screen.getByPlaceholderText('Tell us about your business...');
    await userEvent.type(promptInput, 'modern and professional');
    
    const generateButton = screen.getByRole('button', { name: /Generate Website/i });
    await userEvent.click(generateButton);

    // Wait for thoughts to appear
    await waitFor(() => {
      const thoughtContainer = screen.getByTestId('thoughts-container');
      const thoughtItems = within(thoughtContainer).getAllByRole('listitem');
      expect(thoughtItems).toHaveLength(2);
      expect(thoughtItems[0]).toHaveTextContent('Starting component generation');
      expect(thoughtItems[1]).toHaveTextContent('Creating a modern hero section');
    }, { timeout: 5000 });

    // Wait for components in preview
    await waitFor(() => {
      const previewContainer = screen.getByTestId('live-preview');
      const components = within(previewContainer).getAllByTestId('live-preview-component');
      expect(components).toHaveLength(2);
      expect(components[0]).toHaveTextContent('HeroSection (Complete)');
      expect(components[1]).toHaveTextContent('FeatureGrid (Complete)');
    }, { timeout: 5000 });
  });

  test('handles errors in component generation', async () => {
    render(<GeneratePage />);

    // Fill form and submit
    const promptInput = screen.getByPlaceholderText('Tell us about your business...');
    await userEvent.type(promptInput, 'error case');
    
    const generateButton = screen.getByRole('button', { name: /Generate Website/i });
    await userEvent.click(generateButton);

    // Wait for error message
    await waitFor(() => {
      const previewContainer = screen.getByTestId('preview-content');
      expect(previewContainer).toHaveTextContent('Failed to generate component');
    }, { timeout: 5000 });
  });
});

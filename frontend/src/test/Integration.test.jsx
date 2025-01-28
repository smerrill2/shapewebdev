import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
const mockServer = require('./mockServer');
import GeneratePage from '../pages/GeneratePage';
import LivePreview from '../components/LivePreview';

// Increase test timeout to 30 seconds
jest.setTimeout(30000);

let serverInstance;

// Establish API mocking before all tests
beforeAll(() => {
  console.log('Starting mock server...');
  serverInstance = mockServer.listen(3001);
});

// Reset any request handlers that we may add during the tests
afterEach(() => {
  console.log('Resetting mock handlers...');
  // Clear all event listeners
  mockServer.removeAllListeners('request');
});

// Clean up after the tests are finished
afterAll(() => {
  console.log('Closing mock server...');
  serverInstance.close();
});

describe('Component Rendering Integration', () => {
  test('renders parent and child components with correct hierarchy', async () => {
    // Setup mock server response with proper event stream format
    mockServer.on('request', (req, res) => {
      if (req.method === 'POST' && req.url === '/api/generate') {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        });

        // Send test component data
        const testData = {
          type: 'content_block_delta',
          delta: {
            name: 'TestComponent',
            code: 'function TestComponent() { return <div>Test</div>; }',
            error: null
          },
          metadata: {
            isComponent: true,
            isComplete: true
          }
        };

        res.write(`data: ${JSON.stringify(testData)}\n\n`);
        res.write('data: {"type":"message_stop"}\n\n');
        res.end();
      }
    });

    await act(async () => {
      render(<GeneratePage />);
    });
    
    const promptInput = screen.getByTestId('prompt-input');
    const submitButton = screen.getByTestId('generate-button');
    
    await act(async () => {
      await userEvent.type(promptInput, 'Create a test component');
      await userEvent.click(submitButton);
    });

    // Wait for component to appear
    await waitFor(() => {
      expect(screen.getByTestId('preview-TestComponent')).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  test('handles malformed parent-child relationships', async () => {
    mockServer.on('request', (req, res) => {
      if (req.method === 'POST' && req.url === '/api/generate') {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        });

        const errorData = {
          type: 'content_block_delta',
          delta: {
            error: 'Invalid component structure detected'
          },
          metadata: {
            isError: true
          }
        };

        res.write(`data: ${JSON.stringify(errorData)}\n\n`);
        res.write('data: {"type":"message_stop"}\n\n');
        res.end();
      }
    });

    await act(async () => {
      render(<GeneratePage />);
    });
    
    const promptInput = screen.getByTestId('prompt-input');
    const submitButton = screen.getByTestId('generate-button');
    
    await act(async () => {
      await userEvent.type(promptInput, 'Create parent with invalid child');
      await userEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(screen.getByTestId('stream-status')).toHaveClass('text-red-400');
    }, { timeout: 2000 });
  });

  test('handles component generation errors', async () => {
    mockServer.on('request', (req, res) => {
      if (req.method === 'POST' && req.url === '/api/generate') {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Test error message' }));
      }
    });

    await act(async () => {
      render(<GeneratePage />);
    });
    
    const promptInput = screen.getByTestId('prompt-input');
    const submitButton = screen.getByTestId('generate-button');
    
    await act(async () => {
      await userEvent.type(promptInput, 'broken component');
      await userEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(screen.getByTestId('stream-status')).toHaveClass('text-red-400');
    }, { timeout: 2000 });
  });
});

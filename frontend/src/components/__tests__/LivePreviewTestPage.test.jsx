import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import LivePreviewTestPage from '../LivePreviewTestPage';

// Mock the window.dispatchEvent
const mockDispatchEvent = jest.fn();
window.dispatchEvent = mockDispatchEvent;

describe('LivePreviewTestPage - Test Stream', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle test stream events correctly', async () => {
    render(<LivePreviewTestPage />);

    // Find and click the test stream button
    const testButton = screen.getByText('Run Test Stream');
    fireEvent.click(testButton);

    // Wait for all stream events to be processed
    await waitFor(() => {
      expect(mockDispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'CustomEvent',
          detail: expect.objectContaining({
            type: 'content_block_start'
          })
        })
      );
    });

    // Verify component start event
    expect(mockDispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: expect.objectContaining({
          type: 'content_block_start',
          metadata: expect.objectContaining({
            componentId: 'comp_testcomponent',
            componentName: 'TestComponent'
          })
        })
      })
    );

    // Verify delta events
    expect(mockDispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: expect.objectContaining({
          type: 'content_block_delta',
          metadata: expect.objectContaining({
            componentId: 'comp_testcomponent'
          }),
          delta: expect.objectContaining({
            text: expect.stringContaining('TestComponent')
          })
        })
      })
    );

    // Verify stop event
    expect(mockDispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: expect.objectContaining({
          type: 'content_block_stop',
          metadata: expect.objectContaining({
            componentId: 'comp_testcomponent',
            isComplete: true
          })
        })
      })
    );

    // Verify message_stop event
    expect(mockDispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: expect.objectContaining({
          type: 'message_stop'
        })
      })
    );

    // Verify the component is rendered
    await waitFor(() => {
      expect(screen.getByText('Test Component')).toBeInTheDocument();
      expect(screen.getByText('This is a test component to verify the streaming functionality.')).toBeInTheDocument();
      expect(screen.getByText('Click Me')).toBeInTheDocument();
    });
  });

  it('should reset state before starting new test stream', async () => {
    render(<LivePreviewTestPage />);

    const testButton = screen.getByText('Run Test Stream');
    
    // Run stream twice
    fireEvent.click(testButton);
    await waitFor(() => {
      expect(screen.getByText('Test Component')).toBeInTheDocument();
    });

    fireEvent.click(testButton);
    
    // Verify only one instance of the component exists
    const headings = screen.getAllByText('Test Component');
    expect(headings).toHaveLength(1);
  });
}); 
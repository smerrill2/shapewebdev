import { renderHook, act } from '@testing-library/react';
import { useSSEListener } from '../useSSEListener';

// Mock EventSource
class MockEventSource {
  constructor(url) {
    this.url = url;
    this.onmessage = null;
    this.onerror = null;
  }

  close() {
    this.onmessage = null;
    this.onerror = null;
  }

  // Helper to simulate receiving an event
  simulateMessage(data) {
    if (this.onmessage) {
      this.onmessage({ data: JSON.stringify(data) });
    }
  }

  // Helper to simulate an error
  simulateError(error) {
    if (this.onerror) {
      this.onerror(error);
    }
  }
}

// Mock registry
const mockRegistry = {
  startComponent: jest.fn(),
  appendToComponent: jest.fn(),
  completeComponent: jest.fn(),
};

describe('useSSEListener', () => {
  let originalEventSource;
  let mockEventSource;

  beforeAll(() => {
    originalEventSource = global.EventSource;
    global.EventSource = MockEventSource;
  });

  afterAll(() => {
    global.EventSource = originalEventSource;
  });

  beforeEach(() => {
    mockEventSource = null;
    jest.spyOn(global, 'EventSource').mockImplementation((url) => {
      mockEventSource = new MockEventSource(url);
      return mockEventSource;
    });
    jest.clearAllMocks();
  });

  it('connects to SSE endpoint on mount when autoConnect is true', () => {
    const endpoint = '/api/generate';
    renderHook(() => useSSEListener(endpoint, mockRegistry));
    
    expect(EventSource).toHaveBeenCalledWith(endpoint);
  });

  it('does not connect when autoConnect is false', () => {
    const endpoint = '/api/generate';
    renderHook(() => useSSEListener(endpoint, mockRegistry, { autoConnect: false }));
    
    expect(EventSource).not.toHaveBeenCalled();
  });

  it('handles content_block_start events correctly', () => {
    const endpoint = '/api/generate';
    renderHook(() => useSSEListener(endpoint, mockRegistry));

    const event = {
      type: 'content_block_start',
      componentId: 'test-component',
      metadata: { position: 'header' },
    };

    act(() => {
      mockEventSource.simulateMessage(event);
    });

    expect(mockRegistry.startComponent).toHaveBeenCalledWith(
      'test-component',
      { position: 'header' }
    );
  });

  it('handles content_block_delta events correctly', () => {
    const endpoint = '/api/generate';
    renderHook(() => useSSEListener(endpoint, mockRegistry));

    const event = {
      type: 'content_block_delta',
      componentId: 'test-component',
      content: 'const x = 1;',
    };

    act(() => {
      mockEventSource.simulateMessage(event);
    });

    expect(mockRegistry.appendToComponent).toHaveBeenCalledWith(
      'test-component',
      'const x = 1;'
    );
  });

  it('handles content_block_stop events correctly', () => {
    const endpoint = '/api/generate';
    renderHook(() => useSSEListener(endpoint, mockRegistry));

    const event = {
      type: 'content_block_stop',
      componentId: 'test-component',
    };

    act(() => {
      mockEventSource.simulateMessage(event);
    });

    expect(mockRegistry.completeComponent).toHaveBeenCalledWith('test-component');
  });

  it('handles invalid JSON gracefully', () => {
    const endpoint = '/api/generate';
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    
    renderHook(() => useSSEListener(endpoint, mockRegistry));

    act(() => {
      mockEventSource.onmessage({ data: 'invalid json' });
    });

    expect(consoleSpy).toHaveBeenCalled();
    expect(mockRegistry.startComponent).not.toHaveBeenCalled();
    expect(mockRegistry.appendToComponent).not.toHaveBeenCalled();
    expect(mockRegistry.completeComponent).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('attempts to reconnect after error', () => {
    jest.useFakeTimers();
    const endpoint = '/api/generate';
    
    renderHook(() => useSSEListener(endpoint, mockRegistry, { reconnectDelay: 1000 }));
    
    // Simulate an error
    act(() => {
      mockEventSource.simulateError(new Error('Connection lost'));
    });

    // Fast-forward past reconnect delay
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(EventSource).toHaveBeenCalledTimes(2);
    
    jest.useRealTimers();
  });

  it('cleans up EventSource on unmount', () => {
    const endpoint = '/api/generate';
    const { unmount } = renderHook(() => useSSEListener(endpoint, mockRegistry));

    const closeSpy = jest.spyOn(mockEventSource, 'close');
    
    unmount();

    expect(closeSpy).toHaveBeenCalled();
  });

  it('provides isConnected status', () => {
    const endpoint = '/api/generate';
    const { result } = renderHook(() => useSSEListener(endpoint, mockRegistry));

    expect(result.current.isConnected).toBe(true);

    act(() => {
      result.current.disconnect();
    });

    expect(result.current.isConnected).toBe(false);
  });
}); 
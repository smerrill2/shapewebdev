import { useEffect, useRef, useCallback } from 'react';

/**
 * @typedef {Object} SSEEvent
 * @property {'content_block_start' | 'content_block_delta' | 'content_block_stop'} type
 * @property {string} componentId
 * @property {string} [content]
 * @property {Object} [metadata]
 * @property {string} [metadata.position]
 */

/**
 * Hook to handle Server-Sent Events for streaming component updates
 * @param {string} endpoint - The SSE endpoint URL
 * @param {Object} registry - The component registry instance
 * @param {Object} [options] - Additional options
 * @param {boolean} [options.autoConnect=true] - Whether to connect automatically on mount
 * @param {number} [options.reconnectDelay=1000] - Delay in ms before reconnecting after an error
 */
export function useSSEListener(endpoint, registry, options = {}) {
  const {
    autoConnect = true,
    reconnectDelay = 1000,
  } = options;

  const eventSourceRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  const handleEvent = useCallback((event) => {
    try {
      /** @type {SSEEvent} */
      const data = JSON.parse(event.data);

      switch (data.type) {
        case 'content_block_start':
          registry.startComponent(data.componentId, data.metadata);
          break;

        case 'content_block_delta':
          if (data.content) {
            registry.appendToComponent(data.componentId, data.content);
          }
          break;

        case 'content_block_stop':
          registry.completeComponent(data.componentId);
          break;

        default:
          console.warn(`Unknown event type: ${data.type}`);
      }
    } catch (error) {
      console.error('Error processing SSE event:', error);
    }
  }, [registry]);

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const eventSource = new EventSource(endpoint);
    eventSourceRef.current = eventSource;

    eventSource.onmessage = handleEvent;

    eventSource.onerror = (error) => {
      console.error('SSE connection error:', error);
      eventSource.close();
      eventSourceRef.current = null;

      // Attempt to reconnect after delay
      reconnectTimeoutRef.current = setTimeout(() => {
        if (document.visibilityState !== 'hidden') {
          connect();
        }
      }, reconnectDelay);
    };

    // Handle page visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !eventSourceRef.current) {
        connect();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [endpoint, handleEvent, reconnectDelay]);

  useEffect(() => {
    if (autoConnect) {
      const cleanup = connect();

      return () => {
        cleanup();
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
          eventSourceRef.current = null;
        }
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };
    }
  }, [autoConnect, connect]);

  return {
    isConnected: !!eventSourceRef.current,
    connect,
    disconnect: () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    },
  };
} 
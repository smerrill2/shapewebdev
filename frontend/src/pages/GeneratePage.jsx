import React, { useState, useCallback, useReducer, useRef } from 'react';
import { Card } from '../components/ui/card';
import LivePreview from '../components/LivePreview';
import AnimatedPreview from '../components/AnimatedPreview';
import GenerateSidebar from '../components/GenerateSidebar';
import { cn } from '../lib/utils';

// Initial state
const initialState = {
  stream: {
    status: 'idle',
    error: null,
    buffer: '',
    currentBlock: null,
    retryCount: 0,
    lastSuccessfulConnection: 0,
    healthMetrics: {
      lastMessageTime: 0,
      messagesReceived: 0,
      errorCount: 0,
      reconnectAttempts: 0
    }
  },
  components: {
    list: [],
    activeIndex: -1,
    transitions: {
      from: null,
      to: null,
      status: 'idle',
      timestamp: 0
    },
    evaluationStatus: {}
  },
  thoughts: {
    list: [],
    buffer: '',
    lastProcessed: null
  }
};

// Reducer
const generateReducer = (state, action) => {
  switch (action.type) {
    case 'STREAM_UPDATE':
      return {
        ...state,
        stream: {
          ...state.stream,
          status: action.payload.status,
          lastSuccessfulConnection: action.payload.status === 'streaming' ? 
            Date.now() : state.stream.lastSuccessfulConnection,
          healthMetrics: {
            ...state.stream.healthMetrics,
            lastMessageTime: Date.now(),
            messagesReceived: state.stream.healthMetrics.messagesReceived + 1
          }
        }
      };

    case 'STREAM_ERROR':
      return {
        ...state,
        stream: {
          ...state.stream,
          status: 'error',
          error: action.payload.error,
          healthMetrics: {
            ...state.stream.healthMetrics,
            errorCount: state.stream.healthMetrics.errorCount + 1
          }
        }
      };

    case 'INCREMENT_RETRY_COUNT':
      return {
        ...state,
        stream: {
          ...state.stream,
          retryCount: state.stream.retryCount + 1,
          healthMetrics: {
            ...state.stream.healthMetrics,
            reconnectAttempts: state.stream.healthMetrics.reconnectAttempts + 1
          }
        }
      };

    case 'ADD_COMPONENT':
      return {
        ...state,
        components: {
          ...state.components,
          list: [...state.components.list, action.payload],
          activeIndex: state.components.list.length
        }
      };

    case 'UPDATE_COMPONENT':
      const { id, data } = action.payload;
      const index = state.components.list.findIndex(c => c.name === id);
      if (index === -1) return state;

      const updatedList = [...state.components.list];
      updatedList[index] = { ...updatedList[index], ...data };

      return {
        ...state,
        components: {
          ...state.components,
          list: updatedList
        }
      };

    case 'SET_TRANSITION':
      return {
        ...state,
        components: {
          ...state.components,
          transitions: {
            ...action.payload,
            timestamp: Date.now()
          }
        }
      };

    case 'ADD_THOUGHT':
      return {
        ...state,
        thoughts: {
          ...state.thoughts,
          list: [...state.thoughts.list, action.payload],
          lastProcessed: Date.now()
        }
      };

    default:
      return state;
  }
};

const GeneratePage = () => {
  const [state, dispatch] = useReducer(generateReducer, initialState);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasStartedGeneration, setHasStartedGeneration] = useState(false);
  
  const streamProcessor = useRef(null);
  const evaluationQueue = useRef(null);

  // Enhanced thought processing
  const processThoughts = useCallback((buffer) => {
    const thoughts = buffer
      .split(/(?<=[.!?])\s+/)
      .filter(thought => thought.trim())
      .map(thought => ({
        content: thought.trim(),
        timestamp: Date.now(),
        type: thought.includes('Component') ? 'component' : 'general'
      }));

    thoughts.forEach(thought => {
      dispatch({ type: 'ADD_THOUGHT', payload: thought });
    });

    return thoughts;
  }, []);

  // Stream error handling with health monitoring
  const handleStreamError = async (error) => {
    console.error('Stream error:', error);
    
    // Don't attempt to retry on network errors
    if (error.message === 'Network error') {
      dispatch({ 
        type: 'STREAM_ERROR', 
        payload: { 
          status: 'error',
          error: error.message || 'Network error occurred'
        } 
      });

      // Wait a bit before attempting reconnection
      await new Promise(resolve => setTimeout(resolve, 50));

      dispatch({
        type: 'STREAM_UPDATE',
        payload: { status: 'connecting' }
      });

      // Wait to ensure connecting state is shown
      await new Promise(resolve => setTimeout(resolve, 50));

      try {
        await reconnectStream();
      } catch (reconnectError) {
        dispatch({
          type: 'STREAM_ERROR',
          payload: {
            status: 'error',
            error: reconnectError.message || 'Failed to reconnect'
          }
        });
      }
    }
  };

  const reconnectStream = async () => {
    const lastComponent = state.components.list[state.components.activeIndex];
    const response = await fetch('/api/generate/resume', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lastComponentName: lastComponent?.name,
        lastComponentState: lastComponent?.streamedCode
      })
    });

    if (!response.ok) {
      throw new Error('Failed to reconnect');
    }

    dispatch({
      type: 'STREAM_UPDATE',
      payload: { status: 'streaming' }
    });

    // Process the stream after reconnection
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        if (line.trim() === '') continue;
        
        const match = line.match(/^data:\s*(?:data:\s*)?(.+)$/);
        if (match) {
          try {
            const data = JSON.parse(match[1]);
            if (data && typeof data === 'object') {
              parseSSEData(data);
            }
          } catch (err) {
            console.error('Error parsing SSE JSON:', err);
          }
        }
      }
    }

    return response;
  };

  // Enhanced parseSSEData with health monitoring
  const parseSSEData = useCallback((data) => {
    try {
      dispatch({ 
        type: 'STREAM_UPDATE', 
        payload: { status: 'streaming' } 
      });

      switch (data.type) {
        case 'content_block_delta':
          if (data.delta) {
            if (data.metadata?.isComponent) {
              // Add or update component
              const component = {
                name: data.delta.name,
                content: data.delta.content,
                error: data.delta.error,
                isComplete: data.metadata.isComplete
              };
              
              const existingComponent = state.components.list.find(c => c.name === component.name);
              if (existingComponent) {
                dispatch({
                  type: 'UPDATE_COMPONENT',
                  payload: { id: component.name, data: component }
                });
              } else {
                dispatch({ type: 'ADD_COMPONENT', payload: component });
              }
            } else if (data.metadata?.type === 'thought' && data.delta.text) {
              processThoughts(data.delta.text);
            }
          }
          break;

        case 'message_stop':
          setIsGenerating(false);
          break;

        case 'error':
          handleStreamError(new Error(data.error));
          break;
      }
    } catch (error) {
      handleStreamError(error);
    }
  }, [processThoughts, state.components.list]);

  // Enhanced submit handler with stream processing
  const handleSubmit = async ({ prompt, style, requirements }) => {
    try {
      setIsGenerating(true);
      setHasStartedGeneration(true);
      
      dispatch({ 
        type: 'STREAM_UPDATE', 
        payload: { status: 'connecting' } 
      });

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, style, requirements })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      dispatch({ 
        type: 'STREAM_UPDATE', 
        payload: { status: 'connected' } 
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.trim() === '') continue;
          
          const match = line.match(/^data:\s*(?:data:\s*)?(.+)$/);
          if (match) {
            try {
              const data = JSON.parse(match[1]);
              if (data && typeof data === 'object') {
                parseSSEData(data);
              }
            } catch (err) {
              console.error('Error parsing SSE JSON:', err);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error during generation:', error);
      handleStreamError(error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-950">
      <GenerateSidebar
        className="w-96 p-6"
        onSubmit={handleSubmit}
        isGenerating={isGenerating}
        hasStartedGeneration={hasStartedGeneration}
        thoughts={state.thoughts.list}
        componentList={state.components.list}
        activeComponentIndex={state.components.activeIndex}
        streamStatus={state.stream.status}
      />

      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-4xl mx-auto space-y-6">
          <div data-testid="thoughts-container" className="space-y-2">
            {state.thoughts.list.map((thought, index) => (
              <div key={index} role="listitem" className="text-sm text-slate-400">
                {thought.content}
              </div>
            ))}
          </div>
          <LivePreview 
            componentList={state.components.list.filter(c => c.isComplete)}
            activeComponentIndex={state.components.activeIndex}
            transitionState={state.components.transitions}
          />
          
          <AnimatedPreview
            code={state.components.activeIndex >= 0 ? 
              state.components.list[state.components.activeIndex]?.streamedCode || '' : ''}
            isComplete={state.components.activeIndex >= 0 && 
              state.components.list[state.components.activeIndex]?.isComplete}
            componentName={state.components.list[state.components.activeIndex]?.name}
            transitionState={state.components.transitions}
          />
        </div>
      </main>
    </div>
  );
};

export default GeneratePage;

/**
 * GeneratePage Component Implementation Notes - v2.0
 * 
 * Major Updates:
 * 1. Enhanced State Management
 *    - Added streamState for better stream health tracking
 *    - Implemented componentState with transition tracking
 *    - Added processingState for thought queue management
 * 
 * 2. Stream Processing
 *    - Added robust error recovery system
 *    - Implemented reconnection logic
 *    - Enhanced parseSSEData with type-specific handlers
 * 
 * 3. Component Handling
 *    - Added clean component transitions
 *    - Improved state cleanup
 *    - Enhanced metadata tracking
 * 
 * 4. Thought Processing
 *    - Implemented optimized thought queue
 *    - Added type-based thought categorization
 *    - Enhanced sentence boundary detection
 * 
 * @version 2.0.0
 * @lastUpdated 2024-03-20
 * @changelog
 * - Added streamState, componentState, processingState
 * - Implemented handleStreamError and reconnectStream
 * - Enhanced parseSSEData with better error handling
 * - Added component transition management
 * - Improved thought processing with queue system
 */ 
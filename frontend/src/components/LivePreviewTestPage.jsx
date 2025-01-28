import React, { useState, useEffect } from 'react';
import SimpleLivePreview from './SimpleLivePreview';

const TEST_PROMPTS = {
  singleComponent: {
    prompt: 'Create a simple header component',
    style: 'modern and clean',
    requirements: 'Just a header with a title and subtitle'
  },
  multiComponent: {
    prompt: 'Create a landing page with header, hero section with background image, and footer',
    style: 'modern and professional',
    requirements: 'Include navigation in header, hero section with Placeholder.Image for background, call-to-action buttons, and contact info with social icons in footer'
  },
  rootLayoutOnly: {
    prompt: 'Just create a root layout component',
    style: 'minimal',
    requirements: 'Only the RootLayout, no other components'
  },
  invalidComponent: {
    prompt: 'Create a component with errors',
    style: 'broken',
    requirements: 'Make some validation fail'
  }
};

export default function LivePreviewTestPage() {
  const [registry, setRegistry] = useState({
    components: new Map([
      ['root_layout', {
        name: 'RootLayout',
        code: '', 
        isLayout: true,
        position: 'main'
      }]
    ]),
    layout: { sections: { header: [], main: [], footer: [] } }
  });
  const [streamingStates, setStreamingStates] = useState(new Map());
  const [selectedTest, setSelectedTest] = useState('singleComponent');
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Debug logging for state changes
  useEffect(() => {
    console.log('📊 LivePreviewTestPage State:', {
      registrySize: registry?.components?.size,
      streamingStatesSize: streamingStates?.size,
      registry: registry?.components ? Object.fromEntries(registry.components) : null,
      streamingStates: streamingStates ? Object.fromEntries(streamingStates) : null
    });
  }, [registry, streamingStates]);

  // Add test project and version IDs
  const TEST_PROJECT_ID = 'test-project-1';
  const TEST_VERSION_ID = 'test-version-1';

  // Helper function to validate JSX code
  const validateCode = (code) => {
    // Remove import statements
    code = code.replace(/^import\s+.*?['"]\s*;?\s*$/gm, '');
    
    // Remove export statements but keep the component definition
    code = code.replace(/^export\s+default\s+/gm, '');
    code = code.replace(/^export\s+/gm, '');
    
    // Ensure proper JSX tag closure
    const openTags = (code.match(/</g) || []).length;
    const closeTags = (code.match(/>/g) || []).length;
    
    // Basic validation
    if (openTags !== closeTags) {
      code = code.replace(/[^}]*$/, ''); // Remove incomplete JSX
    }

    return code;
  };

  // Process component start event with batched updates
  const processComponentStart = (event) => {
    setRegistry(prevRegistry => {
      const newComponents = new Map(prevRegistry.components);
      const componentId = event.metadata.componentId;
      
      // Update registry
      if (componentId) {
        newComponents.set(componentId, {
          name: event.metadata.componentName,
          code: '',
          isLayout: componentId === 'root_layout',
          position: event.metadata.position || 'main'
        });

        // Update streaming states within same update
        setStreamingStates(prevStates => {
          const newStates = new Map(prevStates);
          newStates.set(componentId, {
            isStreaming: true,
            isComplete: false,
            error: null
          });
          return newStates;
        });
      }

      return { ...prevRegistry, components: newComponents };
    });
  };

  // Process component delta with JSX validation
  const processComponentDelta = (event) => {
    setRegistry(prevRegistry => {
      const newComponents = new Map(prevRegistry.components);
      const componentId = event.metadata.componentId;
      const existingComponent = componentId && newComponents.get(componentId);
      
      if (existingComponent) {
        const newCode = (existingComponent.code || '') + event.delta.text;
        const validatedCode = validateCode(newCode);
        
        newComponents.set(componentId, {
          ...existingComponent,
          code: validatedCode
        });
      }

      return { ...prevRegistry, components: newComponents };
    });
  };

  // Process component stop with proper cleanup
  const processComponentStop = (event) => {
    const stopComponentId = event.metadata.componentId;
    
    setStreamingStates(prevStates => {
      const newStates = new Map(prevStates);
      if (stopComponentId) {
        newStates.set(stopComponentId, {
          isStreaming: false,
          isComplete: true,
          error: null
        });
      }
      return newStates;
    });

    // Handle root layout completion
    if (stopComponentId === 'root_layout') {
      setRegistry(prev => {
        const newComponents = new Map(prev.components);
        const rootLayout = newComponents.get('root_layout');
        if (rootLayout) {
          newComponents.set('root_layout', {
            ...rootLayout,
            code: `${rootLayout.code}\n\n// Root layout completion marker`
          });
        }
        return { ...prev, components: newComponents };
      });
    }

    // Update sections if provided
    if (event.metadata.sections) {
      setRegistry(prev => ({
        ...prev,
        layout: {
          sections: { ...event.metadata.sections }
        }
      }));
    }
  };

  const runTest = async (testCase) => {
    setIsLoading(true);
    setEvents([]);
    setError(null);
    
    // Reset states with proper Map initialization
    const initialRegistry = {
      components: new Map([
        ['root_layout', {
          name: 'RootLayout',
          code: '', 
          isLayout: true,
          position: 'main'
        }]
      ]),
      layout: { sections: { header: [], main: [], footer: [] } }
    };

    // Initialize streaming states with root_layout
    const initialStreamingStates = new Map([
      ['root_layout', {
        isStreaming: true,
        isComplete: false,
        error: null
      }]
    ]);
    
    setRegistry(initialRegistry);
    setStreamingStates(initialStreamingStates);

    try {
      const requestUrl = `http://localhost:5001/api/generate?projectId=${TEST_PROJECT_ID}&versionId=${TEST_VERSION_ID}`;
      const requestBody = TEST_PROMPTS[testCase];
      
      const response = await fetch(requestUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP Error: ${response.status} - ${errorText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim() || !line.startsWith('data: ')) continue;
          
          try {
            const event = JSON.parse(line.slice(5));
            setEvents(prev => [...prev, event]);
            
            if (event.type === 'error') {
              setError(event.message || 'Unknown stream error');
              continue;
            }
            
            switch (event.type) {
              case 'content_block_start':
                processComponentStart(event);
                break;

              case 'content_block_delta':
                processComponentDelta(event);
                break;

              case 'content_block_stop':
                processComponentStop(event);
                break;

              default:
                console.warn('⚠️ Unknown event type:', event.type);
            }
          } catch (error) {
            console.error('❌ Failed to parse SSE data:', error, '\nRaw line:', line);
            setError(`Failed to parse stream data: ${error.message}`);
          }
        }
      }

      // Final cleanup: mark all streaming components as complete
      setStreamingStates(prev => {
        const newStates = new Map(prev);
        Array.from(newStates.keys()).forEach(id => {
          if (newStates.get(id).isStreaming) {
            newStates.set(id, { 
              isStreaming: false, 
              isComplete: true,
              error: null
            });
          }
        });
        return newStates;
      });

    } catch (error) {
      console.error('❌ Test error:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#0B1121]">
      <div className="w-[400px] p-4 border-r border-slate-700">
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-200">Live Preview Tests</h2>
          
          <div className="space-y-2">
            <select
              value={selectedTest}
              onChange={(e) => setSelectedTest(e.target.value)}
              className="w-full p-2 rounded bg-slate-800 text-slate-200 border border-slate-600"
            >
              {Object.keys(TEST_PROMPTS).map(key => (
                <option key={key} value={key}>
                  {key}
                </option>
              ))}
            </select>

            <button
              onClick={() => runTest(selectedTest)}
              disabled={isLoading}
              className={`w-full p-2 rounded ${
                isLoading 
                  ? 'bg-slate-700 text-slate-400' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {isLoading ? 'Running Test...' : 'Run Test'}
            </button>
          </div>

          {error && (
            <div className="p-4 bg-red-900/50 border border-red-700 rounded text-red-200 text-sm">
              {error}
            </div>
          )}

          <div className="mt-4">
            <h3 className="text-lg font-semibold text-slate-300 mb-2">Events</h3>
            <div className="h-[500px] overflow-y-auto bg-slate-800 rounded p-2">
              {events.map((event, i) => (
                <div 
                  key={i} 
                  className={`mb-2 text-sm p-2 rounded ${
                    event.type === 'error' ? 'bg-red-900/30 text-red-200' : 'text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`${
                      event.type === 'error' ? 'text-red-400' :
                      event.type === 'content_block_start' ? 'text-blue-400' :
                      event.type === 'content_block_stop' ? 'text-green-400' :
                      'text-purple-400'
                    }`}>
                      {event.type}
                    </span>
                    {event.metadata?.componentId && (
                      <span className="text-slate-400">- {event.metadata.componentId}</span>
                    )}
                  </div>
                  {event.delta?.text && (
                    <pre className="text-xs mt-1 whitespace-pre-wrap">
                      {event.delta.text.slice(0, 100)}
                      {event.delta.text.length > 100 ? '...' : ''}
                    </pre>
                  )}
                  {event.message && (
                    <div className="text-red-200 mt-1">{event.message}</div>
                  )}
            </div>
          ))}
        </div>
          </div>
        </div>
      </div>
      
      <div className="flex-1 p-4">
        <SimpleLivePreview 
          registry={registry}
          streamingStates={streamingStates}
        />
      </div>
    </div>
  );
} 
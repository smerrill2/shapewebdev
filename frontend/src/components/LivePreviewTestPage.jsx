import React, { useState, useEffect } from 'react';
import SimpleLivePreview from './SimpleLivePreview';
import { cn } from '../lib/utils';

const TEST_PROMPTS = {
  singleComponent: {
    prompt: 'Generate a savage baking page',
    style: 'modern and clean',
    requirements: 'Go crazy on making whatever you want. I want to be able to sell so much fucking bread. 4 components MAX!' 
  },
  multiComponent: {
    prompt: 'Create a modern SaaS landing page with multiple sections',
    style: 'modern, professional, with subtle gradients and clean typography',
    requirements: `
      Include the following sections:
      1. Header with NavigationMenu, dark mode toggle, and call-to-action button
      2. Hero section with gradient background, Placeholder.Image, and multiple Button variants
      3. Features section using Card components and Lucide icons (Zap, Shield, and Sparkles)
      4. Testimonials section with Card components and user avatars using Placeholder.Image
      5. Pricing section with multiple Card components for different tiers
      6. Call-to-action section with gradient background and Button components
      7. Footer with social links using Lucide icons (Twitter, GitHub, LinkedIn)
      
      Use shadcn components:
      - NavigationMenu for header navigation
      - Button with different variants (default, outline, ghost)
      - Card for features and pricing
      - Icons from Lucide for visual elements
      
      Ensure proper spacing and responsive design using Tailwind classes.
      Use modern UI patterns like backdrop blur for header.
    `
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
    <div className="min-h-screen flex flex-col bg-[#0B1121]">
      <div className="flex-none p-4 border-b border-slate-700">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-white mb-4">Live Preview Test Page</h1>
          <div className="flex gap-4 items-center">
            {Object.keys(TEST_PROMPTS).map(testKey => (
              <button
                key={testKey}
                onClick={() => setSelectedTest(testKey)}
                className={cn(
                  "px-4 py-2 rounded-lg transition-colors",
                  selectedTest === testKey
                    ? "bg-purple-600 text-white"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                )}
              >
                {testKey}
              </button>
            ))}
            <button
              onClick={() => runTest(selectedTest)}
              disabled={isLoading}
              className={cn(
                "px-4 py-2 rounded-lg transition-colors ml-auto",
                isLoading
                  ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                  : "bg-green-600 text-white hover:bg-green-700"
              )}
            >
              {isLoading ? 'Generating...' : 'Generate'}
            </button>
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-4">
          <div className="bg-slate-800/50 backdrop-blur rounded-lg overflow-hidden shadow-xl">
            <SimpleLivePreview
              registry={registry}
              streamingStates={streamingStates}
            />
          </div>
        </div>
      </div>
      
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-500/10 border border-red-500 text-red-500 p-4 rounded-lg">
          {error}
        </div>
      )}
    </div>
  );
} 
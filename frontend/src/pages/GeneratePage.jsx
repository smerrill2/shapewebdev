import React, { useState, useCallback, useRef, useEffect } from 'react';
import GenerateSidebar from '../components/GenerateSidebar';
import SimpleLivePreview from '../components/SimpleLivePreview';
import ReactDOM from 'react-dom';

// Debug utilities
const debugStream = (message, data) => {
  console.log(`%c🔍 STREAM DEBUG: ${message}`, 'color: #4CAF50; font-weight: bold;', data);
};

export default function GeneratePage() {
  const [isLoading, setIsLoading] = useState(false);
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
  const [currentComponent, setCurrentComponent] = useState(null);
  const streamCleanupRef = useRef(null);

  // Cleanup function
  useEffect(() => {
    return () => {
      if (streamCleanupRef.current) {
        streamCleanupRef.current();
      }
    };
  }, []);

  const handleSubmit = async ({ prompt, style, requirements }) => {
    if (streamCleanupRef.current) {
      streamCleanupRef.current();
    }

    // Reset states
    setIsLoading(true);
    setRegistry({
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
    setStreamingStates(new Map());
    setCurrentComponent(null);
    
    try {
      console.log('📡 Fetching from /api/generate...');
      const response = await fetch('http://localhost:5001/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream'
        },
        body: JSON.stringify({ prompt, style, requirements })
      });

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }

      const reader = response.body.getReader();
      let isCancelled = false;
      
      streamCleanupRef.current = () => {
        isCancelled = true;
        reader.cancel();
      };

      let buffer = '';
      const eventPattern = /(?:\n)?(data: \{.*?\})(?=\n|$)/gs;

      const processEvents = (text) => {
        buffer += text;
        const events = [];
        let match;
        
        while ((match = eventPattern.exec(buffer)) !== null) {
          try {
            const event = JSON.parse(match[1].replace('data: ', ''));
            events.push(event);
          } catch (e) {
            console.error('Parse error:', match[0], e);
          }
        }
        
        // Keep any partial event in the buffer
        buffer = buffer.slice(eventPattern.lastIndex);
        return events;
      };

      while (!isCancelled) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = new TextDecoder().decode(value);
        const events = processEvents(text);
        
        console.log('🔄 Processing events:', events.length);
        
        for (const data of events) {
          if (isCancelled) break;
          
          console.log('📦 Received message:', { type: data.type, metadata: data.metadata });
          
          switch (data.type) {
            case 'content_block_start':
              if (data.metadata?.componentName) {
                const { componentName, position, componentId } = data.metadata;
                const finalComponentId = componentName === 'RootLayout' 
                  ? 'root_layout' 
                  : componentId || `comp_${componentName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;

                console.log('🎯 Starting component:', { 
                  componentName, 
                  finalComponentId, 
                  position 
                });
                
                // Update registry and streaming state atomically
                setRegistry(prev => {
                  const newComponents = new Map(prev.components);
                  newComponents.set(finalComponentId, {
                    name: componentName,
                    code: '',
                    position: position || 'main',
                    isLayout: componentName === 'RootLayout'
                  });
                  return { ...prev, components: newComponents };
                });

                setStreamingStates(prev => {
                  const newStates = new Map(prev);
                  newStates.set(finalComponentId, {
                    isStreaming: true,
                    isComplete: false
                  });
                  return newStates;
                });
              }
              break;

            case 'content_block_delta':
              if (data.metadata?.componentId) {
                const finalComponentId = data.metadata.componentId;
                const deltaText = data.delta.text;

                console.log('📝 Received delta for component:', {
                  componentId: finalComponentId,
                  deltaLength: deltaText.length
                });

                setRegistry(prev => {
                  const newComponents = new Map(prev.components);
                  const existingComponent = newComponents.get(finalComponentId);
                  if (existingComponent) {
                    newComponents.set(finalComponentId, {
                      ...existingComponent,
                      code: (existingComponent.code || '') + deltaText
                    });
                  }
                  return { ...prev, components: newComponents };
                });
              }
              break;

            case 'content_block_stop':
              if (data.metadata?.componentId) {
                const finalComponentId = data.metadata.componentId;
                
                console.log('✅ Component complete:', {
                  componentId: finalComponentId
                });

                setStreamingStates(prev => {
                  const newStates = new Map(prev);
                  newStates.set(finalComponentId, {
                    isStreaming: false,
                    isComplete: true
                  });
                  return newStates;
                });
              }
              break;

            case 'message_stop':
              console.log('🏁 Stream complete');
              break;
          }
        }
      }
    } catch (error) {
      console.error('❌ Generation error:', error);
    } finally {
      setIsLoading(false);
      streamCleanupRef.current = null;
    }
  };

  return (
    <div className="flex h-screen bg-[#0B1121]">
      <div className="w-[400px] p-4">
        <GenerateSidebar 
          onSubmit={handleSubmit}
          isLoading={isLoading}
        />
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
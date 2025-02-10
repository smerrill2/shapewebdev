// frontend/src/components/__tests__/SimpleLivePreview.jsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { LiveProvider, LivePreview, LiveError } from 'react-live';
import * as LucideIcons from 'lucide-react';
import * as UIComponents from './ui';
import { createUniversalNamespace } from './utils/createUniversalNamespace';
import { extractFunctionDefinitions, cleanCode, cleanCodeForLive } from './utils/babelTransformations';
import * as Babel from '@babel/standalone';
import DevOverlay from './DevOverlay';
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuContent,
  NavigationMenuTrigger,
  NavigationMenuLink,
  NavigationMenuViewport,
} from './ui/navigation-menu';
import { cn } from './utils/cn';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Link } from 'react-router-dom';
import {
  DEBUG_MODE,
  CRITICAL_COMPONENTS,
  NAMESPACED_COMPONENTS,
  ERROR_STATES,
  COMPONENT_STATUS,
  VALID_POSITIONS
} from './utils/config';

// Error boundary for handling component errors
class EnhancedErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Component render error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 text-red-400 text-sm bg-red-950/20 rounded-lg">
          <p className="font-medium">Failed to render component:</p>
          <pre className="mt-2 text-xs overflow-auto">{this.state.error.message}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

// Global styles for proper height handling
const GlobalStyles = () => (
  <style>
    {`
    /* Essential resets only */
    html, body, #root {
      min-height: 100%;
      margin: 0;
      padding: 0;
    }

    /* Minimal isolation wrapper */
    .preview-isolation-wrapper {
      position: relative;
      min-height: 100%;
      width: 100%;
      overflow-y: auto;
    }

    /* Minimal preview root */
    .preview-root {
      width: 100%;
      position: relative;
      min-height: 100%;
      overflow-y: auto;
    }

    /* Essential header containment only */
    .preview-root [style*="position: fixed"]:not(.allow-fixed),
    .preview-root [style*="position:fixed"]:not(.allow-fixed),
    .preview-root .fixed:not(.allow-fixed) {
      position: sticky !important;
      top: 0 !important;
      z-index: 50;
      width: 100%;
    }

    /* Minimal header handling */
    .preview-root header {
      position: sticky;
      top: 0;
      width: 100%;
      z-index: 50;
    }

    /* Basic content flow */
    .preview-root main {
      position: relative;
      z-index: 1;
    }

    /* Simple z-index handling for navigation */
    .preview-root nav {
      position: relative;
      z-index: 45;
    }
    `}
  </style>
);

// Component resolution logging helper (only once)
const logComponentResolution = (name, type, details) => {
  if (DEBUG_MODE) {
    console.group(`🧩 Component Resolution: ${name}`);
    console.log(`Type: ${type}`);
    console.log('Details:', details);
    console.groupEnd();
  }
};

// Re-export the Babel extraction function
export { extractFunctionDefinitions } from './utils/babelTransformations';

// Add debug logging helper at the top level
const debugCode = (code, source) => {
  if (DEBUG_MODE) {
    console.group(`🎭 Live Preview Code: ${source}`);
    console.log('Code length:', code?.length || 0);
    console.log('Code contents:\n', code);
    console.groupEnd();
  }
};

const STREAMING_TIMEOUT = 10000; // Increase timeout to 10 seconds

// Helper to assemble final code from registry components
const assembleFinalCode = (components) => {
  if (!components || components.size === 0) return '';
  
  console.group('🔄 Assembling Final Code');
  
  // Combine all component code
  let finalCode = '';
  const componentArray = Array.from(components.values());
  
  // Sort components - layouts first, then by position (header, main, footer)
  componentArray.sort((a, b) => {
    if (a.isLayout && !b.isLayout) return -1;
    if (!a.isLayout && b.isLayout) return 1;
    
    const positions = { header: 0, main: 1, footer: 2 };
    return (positions[a.position] || 1) - (positions[b.position] || 1);
  });
  
  // Add each component's code, but strip any render statements
  componentArray.forEach(component => {
    if (component.code && component.code.trim()) {
      // Remove any render statements from the component code
      let code = component.code.replace(/render\s*\([^)]+\);?/g, '').trim();
      finalCode += code + '\n\n';
    }
  });
  
  // Add the default export for the last component
  if (finalCode && componentArray.length > 0) {
    const lastComponent = componentArray[componentArray.length - 1];
    if (lastComponent.name) {
      finalCode += `\nexport default ${lastComponent.name};`;
    }
  }
  
  console.log('📦 Assembled Components:', {
    componentCount: componentArray.length,
    components: componentArray.map(c => ({
      name: c.name,
      hasCode: Boolean(c.code),
      position: c.position
    }))
  });
  
  console.log('📄 Final Code:', finalCode);
  console.groupEnd();
  
  return finalCode;
};

// Add CodeDisplay component
const CodeDisplay = ({ code, title }) => (
  <div className="p-4 bg-slate-900/50 rounded-lg mb-4">
    <div className="flex items-center justify-between mb-2">
      <h3 className="text-sm font-medium text-slate-200">{title}</h3>
    </div>
    <pre className="text-sm bg-slate-900 p-4 rounded overflow-auto max-h-[300px]">
      <code className="text-slate-300">{code}</code>
    </pre>
  </div>
);

// Add new component buffer class
class ComponentCodeBuffer {
  constructor() {
    this.buffers = new Map();
  }

  startComponent(id) {
    if (!this.buffers.has(id)) {
      this.buffers.set(id, {
        code: '',
        isComplete: false,
        lastFunctionDeclaration: null
      });
    }
  }

  appendCode(id, newCode) {
    const buffer = this.buffers.get(id);
    if (!buffer) return;

    // Only check for duplicate function declarations, don't transform
    const funcDecl = newCode.match(/(?:export\s+)?(?:function|const)\s+[A-Z][A-Za-z0-9]*\s*(?:\(|=)/);
    if (funcDecl) {
      if (buffer.lastFunctionDeclaration === funcDecl[0]) {
        // Skip duplicate function declaration
        return;
      }
      buffer.lastFunctionDeclaration = funcDecl[0];
    }

    // Store raw code
    buffer.code += newCode;
  }

  completeComponent(id) {
    const buffer = this.buffers.get(id);
    if (buffer) {
      buffer.isComplete = true;
    }
  }

  getCode(id) {
    return this.buffers.get(id)?.code || '';
  }

  isComplete(id) {
    return this.buffers.get(id)?.isComplete || false;
  }

  clear() {
    this.buffers.clear();
  }
}

//////////////////////////////////////////////////////////////////////
// Below is the SimpleLivePreview Component.
//////////////////////////////////////////////////////////////////////
const SimpleLivePreview = ({ registry, streamingStates = new Map(), setStreamingStates, onShowCode }) => {
  const [stableCode, setStableCode] = useState('');
  const streamingTimersRef = useRef(new Map());
  const previousCodeRef = useRef('');
  const codeBufferRef = useRef(new ComponentCodeBuffer());

  // Handle streaming deltas
  useEffect(() => {
    const handleStreamDelta = (event) => {
      const { type, metadata, delta } = event;
      
      if (type === 'content_block_delta' && metadata?.componentId && delta?.text) {
        codeBufferRef.current.startComponent(metadata.componentId);
        codeBufferRef.current.appendCode(metadata.componentId, delta.text);
      }
      
      if (type === 'content_block_stop' && metadata?.componentId) {
        codeBufferRef.current.completeComponent(metadata.componentId);
      }
    };

    window.addEventListener('stream_delta', handleStreamDelta);
    return () => window.removeEventListener('stream_delta', handleStreamDelta);
  }, []);

  // Update stableCode when registry or streamingStates change
  useEffect(() => {
    if (!registry?.components) return;
    
    // Only update if we have any complete components
    const hasCompleteComponents = Array.from(streamingStates.values())
      .some(state => state.isComplete && !state.isStreaming);
      
    if (hasCompleteComponents) {
      // Use buffered code instead of raw registry code
      const components = new Map();
      registry.components.forEach((component, id) => {
        const bufferedCode = codeBufferRef.current.getCode(id);
        if (bufferedCode) {
          // Store raw code without any transformations
          components.set(id, {
            ...component,
            code: bufferedCode,
            isComplete: codeBufferRef.current.isComplete(id)
          });
        } else {
          components.set(id, component);
        }
      });
      
      const finalCode = assembleFinalCode(components);
      
      // Only update if code has changed
      if (finalCode !== previousCodeRef.current) {
        previousCodeRef.current = finalCode;
        debugCode(finalCode, 'New Stable Code');
        setStableCode(finalCode);
      }
    }
  }, [registry?.components, streamingStates]);

  // Handle message_stop event
  useEffect(() => {
    const handleMessageStop = () => {
      if (DEBUG_MODE) {
        console.log('🛑 Stream ended, finalizing components');
      }
      // When stream ends, mark all components as complete if they have code
      setStreamingStates(prev => {
        const next = new Map(prev);
        Array.from(prev.keys()).forEach(id => {
          const bufferedCode = codeBufferRef.current.getCode(id);
          if (bufferedCode) {
            next.set(id, { 
              isStreaming: false, 
              isComplete: true,
              error: null 
            });
          }
        });
        return next;
      });
      
      // Clear the code buffer
      codeBufferRef.current.clear();
    };

    window.addEventListener('message_stop', handleMessageStop);
    return () => window.removeEventListener('message_stop', handleMessageStop);
  }, []);

  // Memoize scope (adjust as needed)
  const enhancedScope = useMemo(() => ({
    React,
    ...UIComponents,
    NavigationMenu,
    NavigationMenuList,
    NavigationMenuItem,
    NavigationMenuContent,
    NavigationMenuTrigger,
    NavigationMenuLink,
    NavigationMenuViewport,
    Button,
    Card,
    Link,
    LucideIcons,
    cn,
    render: (component) => component,
    // Add PriceTag component to scope if it exists in registry
    ...(registry?.components?.get('price_tag') ? {
      PriceTag: (props) => {
        const PriceTagComponent = new Function('React', 'cn', registry.components.get('price_tag').code + '\nreturn PriceTag;')(React, cn);
        return React.createElement(PriceTagComponent, props);
      }
    } : {}),
    // Add any other UI components or utilities needed
  }), [registry?.components]);

  // Transform code before passing to LiveProvider - this is our SINGLE transformation point
  const transformedCode = useMemo(() => {
    if (!stableCode) return '';
    try {
      // Log the code before transformation in debug mode
      if (DEBUG_MODE) {
        console.group('🔄 Code Transformation');
        console.log('Input code:', stableCode);
      }

      // Single transformation using cleanCodeForLive
      const result = cleanCodeForLive(stableCode);

      // Log the transformed code in debug mode
      if (DEBUG_MODE) {
        console.log('Transformed code:', result);
        console.groupEnd();
      }

      return result;
    } catch (error) {
      console.error('Error transforming code:', error);
      return stableCode;
    }
  }, [stableCode]);

  // Add Babel transform function - only for JSX transformation
  const transformCode = useMemo(() => (code) => {
    try {
      // Log the input code in debug mode
      if (DEBUG_MODE) {
        console.group('🔄 Babel JSX Transformation');
        console.log('Input code:', code);
      }

      // First format the code to ensure proper structure
      let formattedCode = code
        // Split into lines and trim each line
        .split('\n')
        .map(line => line.trim())
        .filter(line => line)  // Remove empty lines
        .join('\n');

      // Fix JSX formatting issues
      formattedCode = formattedCode
        // Fix className attributes
        .replace(/className=\{([^}]+)\}/g, (match, content) => {
          // Remove extra curly braces in className values
          const cleaned = content.replace(/[{}]/g, '').trim();
          return `className="${cleaned}"`;
        })
        // Add spaces around JSX expressions
        .replace(/\{(\w+)\}/g, '{ $1 }')
        // Fix self-closing tags
        .replace(/(\s*)\/>/, ' />')
        // Ensure proper spacing in component props
        .replace(/=\{/g, '={ ')
        .replace(/\}/g, ' }')
        // Fix render statement
        .replace(/render\((.*?)\);?$/, (match, content) => {
          return `render(${content.trim()});`;
        });

      // Transform with Babel
      const result = Babel.transform(formattedCode, {
        presets: [
          ['react', {
            runtime: 'classic',
            development: true,
            throwIfNamespace: false
          }]
        ],
        plugins: ['transform-react-jsx'],
        filename: 'live.js',
        sourceType: 'script',
        configFile: false,
        babelrc: false,
        retainLines: true,
        compact: false,
        minified: false,
        comments: true,
        parserOpts: {
          strictMode: false,
          allowReturnOutsideFunction: true,
          allowSuperOutsideMethod: true
        }
      }).code;

      // Log the transformed code in debug mode
      if (DEBUG_MODE) {
        console.log('Transformed code:', result);
        console.groupEnd();
      }

      return result;
    } catch (error) {
      console.error('Babel transform error:', error);
      // On error, try to format and return the original code
      return code
        .split('\n')
        .map(line => line.trim())
        .filter(line => line)
        .join('\n');
    }
  }, []);

  if (!registry?.components) {
    return (
      <div className="p-4 text-muted-foreground bg-muted rounded-lg">
        <span>Ready to generate components</span>
      </div>
    );
  }

  return (
    <EnhancedErrorBoundary>
      <div className="h-full flex flex-col relative isolate">
        <div className="text-sm p-2 bg-muted border-b sticky top-0 z-[60] flex justify-between items-center">
          <span>Live Preview {DEBUG_MODE && `(${registry.components.size} components)`}</span>
          <div className="flex gap-2">
            {Array.from(registry.components.values()).map(component => (
              <button
                key={component.name}
                onClick={() => onShowCode?.(component)}
                className="px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 rounded"
              >
                Show {component.name}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 relative w-full overflow-auto">
          {(!transformedCode || transformedCode.length === 0) && Array.from(streamingStates.values()).some(state => state.isStreaming) && (
            <div className="p-4 text-muted-foreground bg-muted rounded-lg mb-4">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-current" />
                <span>Generating components...</span>
              </div>
            </div>
          )}
          {transformedCode && (
            <div className="preview-isolation-wrapper" data-testid="preview-container">
              <GlobalStyles />
              <LiveProvider 
                code={transformedCode} 
                scope={enhancedScope} 
                noInline={true}  // Change to true to let LiveProvider handle rendering
                transformCode={transformCode}
              >
                <LiveError 
                  className="text-destructive p-4 bg-destructive/10 rounded mb-4 sticky top-0 z-[100]" 
                  data-testid="preview-error" 
                />
                <div 
                  className={cn("w-full preview-root", "space-y-8 p-4")} 
                  data-testid="preview-content"
                >
                  <LivePreview />
                </div>
              </LiveProvider>
            </div>
          )}
        </div>
        <DevOverlay 
          registry={registry} 
          streamingStates={streamingStates} 
          debug={DEBUG_MODE} 
        />
      </div>
    </EnhancedErrorBoundary>
  );
};

//////////////////////////////////////////////////////////////////////
// Remove duplicate helper definitions below (they were already declared above)
//////////////////////////////////////////////////////////////////////

export default SimpleLivePreview;

import React, { useState, useEffect, useMemo } from 'react';
import { LiveProvider, LivePreview, LiveError } from 'react-live';
import * as LucideIcons from 'lucide-react';
import * as UIComponents from './ui';
import { createUniversalNamespace } from './utils/createUniversalNamespace';
import { extractFunctionDefinitions, completeFunctionContent } from './utils/babelTransformations';
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

// Component resolution logging
const logComponentResolution = (name, type, details) => {
  if (DEBUG_MODE) {
    console.group(`🧩 Component Resolution: ${name}`);
    console.log(`Type: ${type}`);
    console.log('Details:', details);
    console.groupEnd();
  }
};

// Replace the old extractFunctionDefinitions function with:
export { extractFunctionDefinitions } from './utils/babelTransformations';

// Update cleanCode to use Babel transformations
export const cleanCode = (rawCode, preserveMarkers = true) => {
  if (!rawCode || typeof rawCode !== 'string') return '';
  
  console.group('🧹 Code Cleaning Process');
  console.log('📥 Raw Code Input:', {
    code: rawCode,
    length: rawCode.length
  });

  // Remove code fences and markers
  let cleanedCode = rawCode
    .replace(/```[a-z]*$/gm, '')
    .replace(/\/\/\/\s*(START|END)\s+\w+(?:\s+position=\w+)?/gm, '')
    .trim();

  // Extract and validate functions using Babel
  const functions = extractFunctionDefinitions(cleanedCode);
  
  // Rebuild the code with validated functions
  let finalCode = '';
  for (const [name, func] of functions) {
    if (func.complete) {
      finalCode += func.content + '\n\n';
    }
  }
  
  // Add render statement if needed
  if (functions.size > 0 && !finalCode.includes('render(')) {
    const mainComponent = Array.from(functions.keys())[functions.size - 1];
    finalCode += `\nrender(<${mainComponent} />);`;
  }
  
  console.log('📤 Cleaned Code Output:', {
    code: finalCode,
    length: finalCode.length,
    functionCount: functions.size
  });
  console.groupEnd();
  
  return finalCode;
};

// 2. Component Stubs (Phase 2 from Guide)
const createStubComponent = (name, element = 'div', defaultProps = {}) => {
  const Component = React.forwardRef(({ className, children, variant, size, ...props }, ref) => {
    if (DEBUG_MODE) {
      console.log(`🎨 Rendering ${name}`, { 
        className, 
        variant, 
        size, 
        hasChildren: !!children,
        childrenType: children?.type,
        props 
      });
    }
    
    // Enhanced variant and size handling with proper text contrast
    let combinedClassName = className || '';
    
    if (variant) {
      const variantMap = {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
      };
      
      // Ensure text contrast for each variant
      const contrastMap = {
        default: 'text-white dark:text-primary-foreground',
        outline: 'text-foreground',
        secondary: 'text-white dark:text-secondary-foreground',
        ghost: 'text-foreground',
        link: 'text-primary dark:text-primary',
        destructive: 'text-white'
      };
      
      combinedClassName = cn(
        combinedClassName,
        variantMap[variant] || variantMap.default,
        contrastMap[variant] || contrastMap.default
      );
    }
    
    if (size) {
      const sizeMap = {
        sm: 'h-9 px-3 text-sm',
        md: 'h-10 px-4 py-2',
        lg: 'h-11 px-8 text-base'
      };
      combinedClassName = cn(combinedClassName, sizeMap[size] || sizeMap.md);
    }

    // Add base button styles if this is a button
    if (element === 'button') {
      combinedClassName = cn(
        'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background',
        combinedClassName
      );
    }
    
    // Verify children for buttons and navigation links
    if (DEBUG_MODE && (name === 'Button' || name === 'NavigationMenu.Link')) {
      if (!children) {
        console.error(`❌ ${name} rendered without children!`);
      } else if (typeof children === 'string' && !children.trim()) {
        console.error(`❌ ${name} rendered with empty text!`);
      }
    }
    
    return React.createElement(element, { 
      ref,
      className: combinedClassName || undefined,
      ...defaultProps,
      ...props,
      children 
    });
  });
  Component.displayName = name;
  return Component;
};

// Create compound component with both direct usage and sub-components
const createCompoundComponent = (baseName, config) => {
  const MainComponent = createStubComponent(baseName, config.Root?.element || 'div', config.Root?.props || {});
  
  const subComponents = Object.entries(config).reduce((acc, [key, { element, props = {} }]) => {
    acc[key] = createStubComponent(`${baseName}.${key}`, element, props);
    return acc;
  }, {});
  
  return Object.assign(MainComponent, subComponents);
};

// Create icon stubs with SVG elements
const createIconStub = (name) => {
  return createStubComponent(`Icons.${name}`, 'svg', {
    width: '1em',
    height: '1em',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round'
  });
};

// Debug overlay for development
const DevOverlay = ({ registry, streamingStates, debug }) => {
  if (!DEBUG_MODE) return null;

  // Group components by status
  const groupedComponents = Array.from(registry.components.entries()).reduce((acc, [id, comp]) => {
    const state = streamingStates.get(id);
    const status = state?.error ? COMPONENT_STATUS.ERROR : 
                  state?.isComplete ? COMPONENT_STATUS.COMPLETE : 
                  state?.isStreaming ? COMPONENT_STATUS.STREAMING : 
                  COMPONENT_STATUS.PENDING;
    if (!acc[status]) acc[status] = [];
    acc[status].push({ id, comp, state });
    return acc;
  }, {});

  return (
    <div className="fixed bottom-0 right-0 bg-black/70 text-white p-4 max-w-sm max-h-[50vh] overflow-auto rounded-tl-lg text-xs font-mono">
      <div className="font-semibold mb-2">Component States</div>
      {Object.entries(groupedComponents).map(([status, items]) => (
        <div key={status} className="mb-4">
          <div className="text-[10px] uppercase tracking-wider opacity-50 mb-1">
            {status} ({items.length})
          </div>
          {items.map(({ id, comp, state }) => {
            const isCritical = CRITICAL_COMPONENTS.has(comp.name);
            return (
              <div key={id} className="mb-2">
                <div className={cn(
                  "flex items-center gap-2",
                  state?.error && "text-red-400",
                  state?.isComplete && "text-green-400",
                  state?.isStreaming && "text-blue-400"
                )}>
                  <span>{comp.name}</span>
                  {isCritical && (
                    <span className="text-[10px] bg-red-500/20 text-red-300 px-1 rounded">
                      critical
                    </span>
                  )}
                  <span className="opacity-50">
                    {state?.isStreaming ? "🔄" : 
                     state?.isComplete ? "✅" : 
                     state?.error ? "❌" : 
                     "⏳"}
                  </span>
                </div>
                {state?.error && (
                  <div className="text-red-400 text-[10px] mt-1 pl-4 border-l border-red-500/30">
                    {state.error === ERROR_STATES.COMPOUND_TIMEOUT ? (
                      <div>
                        <div className="font-medium">Timeout waiting for subcomponents</div>
                        <div className="opacity-75 mt-0.5">Component took too long to complete</div>
                      </div>
                    ) : state.error === ERROR_STATES.VALIDATION_FAILED ? (
                      <div>
                        <div className="font-medium">Invalid component code</div>
                        <div className="opacity-75 mt-0.5">Component failed validation</div>
                      </div>
                    ) : state.error === ERROR_STATES.INCOMPLETE_COMPOUND ? (
                      <div>
                        <div className="font-medium">Incomplete compound component</div>
                        <div className="opacity-75 mt-0.5">Missing required subcomponents</div>
                      </div>
                    ) : (
                      state.error
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
      <div className="mt-4 pt-4 border-t border-white/10 text-[10px] opacity-50">
        Click component names to view details
      </div>
    </div>
  );
};

// Enhanced error boundary with better error display and critical component handling
class EnhancedErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    if (DEBUG_MODE) {
      console.error('🔥 Component Error:', {
        message: error.message,
        componentStack: errorInfo.componentStack,
        fullError: error
      });
    }
  }

  render() {
    if (this.state.hasError) {
      const { componentName } = this.props;
      const isCritical = CRITICAL_COMPONENTS.has(componentName);

      return (
        <div 
          data-testid="error-boundary"
          className={cn(
            "p-4 rounded",
            isCritical 
              ? "border-2 border-destructive bg-destructive/10" 
              : "border border-destructive/50 bg-destructive/5"
          )}
        >
          <div className="flex items-center gap-2">
            <h3 className="text-destructive font-semibold">
              {isCritical ? 'Critical Component Error' : 'Component Error'}
            </h3>
            <span className="text-xs text-destructive/70">
              {componentName}
            </span>
          </div>
          <p className="text-destructive/90 mt-2">
            {this.state.error?.message}
            {this.state.error?.code === ERROR_STATES.COMPOUND_TIMEOUT && (
              <span className="block mt-1 text-sm">
                Timed out waiting for subcomponents to arrive.
              </span>
            )}
          </p>
          {DEBUG_MODE && this.state.error?.componentStack && (
            <pre className="mt-4 text-sm text-destructive/80 whitespace-pre-wrap overflow-auto max-h-[200px]">
              {this.state.error.componentStack}
            </pre>
          )}
          {isCritical && (
            <div className="mt-4 text-sm text-destructive/90 flex items-center gap-2">
              <span className="text-lg">⚠️</span>
              This is a critical component. The page layout may be affected.
            </div>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}

// Create our universal component getter
const getShadcnComponent = createUniversalNamespace();

// Modify the createStreamingWrapper function to handle SSE chunks and positions
const createStreamingWrapper = (components) => {
  if (!Array.isArray(components)) {
    console.error('Invalid components array:', components);
    return '';
  }

  console.group(' Creating Streaming Wrapper');
  console.log('📦 Components to Process:', components.length);

  // Process all components, including streaming ones
  const validComponents = components
    .filter(comp => {
      if (!comp || typeof comp.name !== 'string') {
        console.warn('❌ Skipping invalid component:', comp);
        return false;
      }

      // Extract metadata from markers with more lenient validation
      const startMarker = comp.code.match(/\/\/\/\s*START\s+([A-Z][a-zA-Z0-9]*(?:Section|Layout|Component)?)\s*(?:position=(\w+))?/m);
      const endMarker = comp.code.match(/\/\/\/\s*END\s+([A-Z][a-zA-Z0-9]*(?:Section|Layout|Component)?)/m);
      const functionMatch = comp.code.match(/(?:export\s+(?:default\s+)?)?function\s+([A-Z][a-zA-Z0-9]*(?:Section|Layout|Component)?)\s*\(/);

      // Extract function name even without export
      const anyFunctionMatch = comp.code.match(/function\s+([A-Z][a-zA-Z0-9]*(?:Section|Layout|Component)?)\s*\(/);

      const metadata = {
        markerName: startMarker?.[1],
        position: (startMarker?.[2] || 'main').toLowerCase(),
        functionName: functionMatch?.[1] || anyFunctionMatch?.[1],
        hasStartMarker: !!startMarker,
        hasEndMarker: !!endMarker,
        isComplete: !!startMarker && !!endMarker && !!functionMatch,
        isStreaming: comp.streaming || false,
        timestamp: Date.now()
      };

      // Allow streaming components even if incomplete
      if (!metadata.hasStartMarker && !metadata.isStreaming) {
        console.warn('❌ No start marker found:', metadata);
        return false;
      }

      // For streaming components, be more lenient
      const namesMatch = metadata.isStreaming ? 
        true : // Accept any name during streaming
        (metadata.markerName === metadata.functionName && metadata.functionName === comp.name);
      
      if (!namesMatch && !metadata.isStreaming) {
        console.warn('❌ Name mismatch:', {
          markerName: metadata.markerName,
          functionName: metadata.functionName,
          componentName: comp.name,
          isStreaming: metadata.isStreaming
        });
        return false;
      }

      // Attach metadata for later use
      comp.metadata = metadata;
      return true;
    });

  // Generate ordered components maintaining streaming order
  const componentDefinitions = validComponents
    .map(comp => {
      let cleanedCode = comp.code
        .replace(/\/\/\/\s*START.*\n/gm, '')
        .replace(/\/\/\/\s*END.*\n/gm, '')
        .trim();

      // For streaming components, ensure we have a valid function
      if (comp.metadata.isStreaming && !cleanedCode.includes('function')) {
        cleanedCode = `function ${comp.name}() {\n  return (\n    ${cleanedCode}\n  );\n}`;
      }

      // Add export if missing
      if (!cleanedCode.includes('export')) {
        cleanedCode = `export ${cleanedCode}`;
      }

      return cleanedCode;
    })
    .filter(Boolean)
    .join('\n\n');

  // Build the final code with proper layout structure
  const finalCode = `
// Component Definitions
${componentDefinitions}

// Main Preview Component
function StreamingPreview() {
  return (
    <div className="flex flex-col min-h-screen">
      ${validComponents.map(comp => 
        `<${comp.name} key="${comp.name}" data-testid="preview-${comp.name}" data-position="${comp.metadata.position}" />`
      ).join('\n        ')}
    </div>
  );
}

// Render the preview
render(<StreamingPreview />);
`;

  if (DEBUG_MODE) {
    console.group('📝 Streaming Wrapper Output');
    console.log('Component Count:', validComponents.length);
    console.log('Components:', validComponents.map(c => ({
      name: c.name,
      isComplete: c.metadata.isComplete,
      isStreaming: c.metadata.isStreaming
    })));
    console.log('Final Code:\n', finalCode);
    console.groupEnd();
  }

  console.groupEnd();
  return finalCode;
};

// 5. Preview Component
const PreviewComponent = ({ code, scope }) => {
  const cleanedCode = useMemo(() => {
    if (DEBUG_MODE) {
      console.group('🎭 Preview Component Code Processing');
      console.log('🔄 Code Before Cleaning:', code);
    }
    
    const result = cleanCode(code);
    
    if (DEBUG_MODE) {
      console.log('✨ Code After Cleaning:', result);
      console.groupEnd();
    }
    
    return result;
  }, [code]);
  
  const isStreaming = useMemo(() => {
    const hasRootLayout = !cleanedCode.includes('RootLayout');
    if (DEBUG_MODE) {
      console.log('🌊 Streaming Status:', { 
        isStreaming: hasRootLayout,
        hasRootLayout: !hasRootLayout,
        codeLength: cleanedCode.length
      });
    }
    return hasRootLayout;
  }, [cleanedCode]);

  return (
    <div className="w-full" data-testid="preview-container">
      <GlobalStyles />
      <LiveProvider
        code={cleanedCode}
        scope={scope}
        noInline={true}
      >
        <EnhancedErrorBoundary componentName="LivePreview">
          <LiveError className="text-destructive p-4 bg-destructive/10 rounded mb-4 sticky top-0 z-[100]" data-testid="preview-error" />
          <div 
            className={cn(
              "w-full flex flex-col preview-root",
              isStreaming && "space-y-8 p-4"
            )}
            data-testid="preview-content"
          >
            <LivePreview />
          </div>
        </EnhancedErrorBoundary>
      </LiveProvider>
    </div>
  );
};

// Add debug logging utilities at the top after imports
const debugLog = (section, data) => {
  if (DEBUG_MODE) {
    console.group(`🔍 ${section}`);
    console.log(JSON.stringify(data, null, 2));
    console.groupEnd();
  }
};

const debugComponent = (name, props, state) => {
  if (DEBUG_MODE) {
    console.group(`🧩 Component Debug: ${name}`);
    console.log('Props:', props);
    console.log('State:', state);
    console.groupEnd();
  }
};

// 6. Main Component
const SimpleLivePreview = ({ registry, streamingStates = new Map() }) => {
  const [stableCode, setStableCode] = useState('');
  const [errors, setErrors] = useState(new Map());

  // Add debug logging for streaming states
  useEffect(() => {
    if (DEBUG_MODE) {
      console.group('🌊 Streaming States Update');
      console.log('Current States:', Object.fromEntries(streamingStates));
      console.log('Registry Size:', registry?.components?.size);
      console.groupEnd();
    }
  }, [streamingStates, registry?.components?.size]);

  // Handle streaming state with debug
  const hasStreamingComponents = useMemo(() => {
    const streaming = streamingStates && 
      Array.from(streamingStates.values()).some(state => state.isStreaming);
    
    if (DEBUG_MODE) {
      console.log('🔄 Streaming Components Check:', {
        hasStreaming: streaming,
        states: Object.fromEntries(streamingStates),
        timestamp: new Date().toISOString()
      });
    }
    
    return streaming;
  }, [streamingStates]);

  // Update the main effect to handle streaming better and add debugging
  useEffect(() => {
    if (!registry?.components) return;
    
    const completeComponents = Array.from(registry.components.entries())
      .filter(([id]) => {
        const state = streamingStates?.get(id);
        const isValid = state?.isComplete || state?.isStreaming;
        
        if (DEBUG_MODE) {
          console.log(`📦 Component ${id} State:`, {
            isComplete: state?.isComplete,
            isStreaming: state?.isStreaming,
            isValid,
            timestamp: new Date().toISOString()
          });
        }
        
        return isValid;
      })
      .map(([_, component]) => component);

    if (completeComponents.length > 0) {
      // Find RootLayout but don't wait for it to be complete
      const rootLayout = completeComponents.find(c => c.isLayout);
      const otherComponents = completeComponents.filter(c => !c.isLayout);

      if (DEBUG_MODE) {
        console.group('🏗 Component Assembly');
        console.log('Root Layout:', rootLayout);
        console.log('Other Components:', otherComponents);
        console.groupEnd();
      }

      let finalCode;
      if (rootLayout && streamingStates.get('root_layout')?.isComplete) {
        // Log complete root layout
        if (DEBUG_MODE) {
          console.group('🎯 Root Layout Complete');
          console.log('Final Root Layout Code:');
          console.log(rootLayout.code);
          console.log('All Components:', completeComponents);
          console.groupEnd();
        }

        const componentCode = [
          ...otherComponents.map(comp => cleanCode(comp.code)),
          cleanCode(rootLayout.code)
        ]
          .filter(Boolean)
          .join('\n\n');

        finalCode = `${componentCode}\n\nrender(<RootLayout />);`;
      } else {
        // Use streaming wrapper with debug
        if (DEBUG_MODE) {
          console.group('🌊 Streaming Wrapper Assembly');
          console.log('Components to Stream:', completeComponents);
          console.groupEnd();
        }
        
        finalCode = createStreamingWrapper(completeComponents);
      }

      if (DEBUG_MODE) {
        console.group('📝 Final Code Assembly');
        console.log('Code Length:', finalCode.length);
        console.log('Component Count:', completeComponents.length);
        console.log('Final Code:\n', finalCode);
        console.groupEnd();
      }

      setStableCode(finalCode);
    }
  }, [registry?.components, streamingStates]);

  // Create a memoized scope that includes all necessary dependencies
  const enhancedScope = useMemo(() => ({
    ...ESSENTIAL_SCOPE,
    React,
    NavigationMenu,
    Button,
    Card,
    LucideIcons,
    Link
  }), []);

  if (!registry?.components) {
    return (
      <div className="p-4 text-muted-foreground bg-muted rounded-lg">
        <span>Ready to generate components</span>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col relative isolate">
      <div className="text-sm p-2 bg-muted border-b sticky top-0 z-[60]">
        Live Preview {DEBUG_MODE && `(${registry?.components?.size || 0} components)`}
      </div>
      <div className="flex-1 relative w-full overflow-auto">
        {hasStreamingComponents && !stableCode && (
          <div className="p-4 text-muted-foreground bg-muted rounded-lg mb-4">
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-current" />
              <span>
                Generating components... 
                {DEBUG_MODE && `(${Array.from(streamingStates.entries())
                  .filter(([_, state]) => state.isStreaming)
                  .length} streaming)`}
              </span>
            </div>
          </div>
        )}
        {stableCode && (
          <div className="preview-isolation-wrapper" data-testid="preview-container">
            <GlobalStyles />
            <LiveProvider
              code={stableCode}
              scope={enhancedScope}
              noInline={true}
            >
              <EnhancedErrorBoundary componentName="LivePreview">
                <LiveError 
                  className="text-destructive p-4 bg-destructive/10 rounded mb-4 sticky top-12 z-20" 
                  data-testid="preview-error" 
                />
                <div 
                  className={cn(
                    "w-full preview-root",
                    hasStreamingComponents && "space-y-8"
                  )}
                  data-testid="preview-content"
                >
                  <LivePreview />
                </div>
              </EnhancedErrorBoundary>
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
  );
};

// Add debug warning utility
const warnEmptyElement = (type, props) => {
  if (DEBUG_MODE) {
    console.group('⚠️ Empty Element Warning');
    console.warn(`${type} rendered with no children!`);
    console.log('Props:', props);
    console.groupEnd();
  }
};

// Update the ESSENTIAL_SCOPE with enhanced navigation handling
const ESSENTIAL_SCOPE = {
  ...React,
  
  // Navigation components with only empty state handling
  NavigationMenu: Object.assign(
    (props) => {
      logComponentResolution('NavigationMenu', 'root', { props });
      return <NavigationMenu {...props} />;
    },
    {
      List: (props) => {
        logComponentResolution('NavigationMenu.List', 'subcomponent', { props });
        return <NavigationMenuList {...props} />;
      },
      Item: (props) => {
        logComponentResolution('NavigationMenu.Item', 'subcomponent', { props });
        if (!props.children) {
          warnEmptyElement('NavigationMenu.Item', props);
        }
        return <NavigationMenuItem {...props} />;
      },
      Link: ({ children, ...props }) => {
        logComponentResolution('NavigationMenu.Link', 'subcomponent', { props });
        
        // Only handle empty children, no styling
        if (!children || (typeof children === 'string' && !children.trim())) {
          warnEmptyElement('NavigationMenu.Link', props);
          // Provide fallback content based on href or a default
          const fallbackText = props.href ? 
            props.href.replace(/[#\/]/g, '').split('-').map(
              word => word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' ') : 
            'Menu Link';
            
          children = DEBUG_MODE ? 
            <span>
              {fallbackText}
              <span className="text-xs text-yellow-500">[Empty Link]</span>
            </span> : 
            fallbackText;
        }

        return <NavigationMenuLink {...props}>{children}</NavigationMenuLink>;
      },
      Content: props => <NavigationMenuContent {...props} />,
      Trigger: props => <NavigationMenuTrigger {...props} />,
      Viewport: props => <NavigationMenuViewport {...props} />
    }
  ),
  
  // Button with only empty state handling
  Button: ({ children, ...props }) => {
    if (!children || (typeof children === 'string' && !children.trim())) {
      warnEmptyElement('Button', props);
      children = DEBUG_MODE ? 
        <span>
          Button
          <span className="text-xs text-yellow-500">[Empty Button]</span>
        </span> : 
        'Button';
    }

    return <Button {...props}>{children}</Button>;
  },
  
  // All shadcn components through universal namespace with logging
  ...Object.fromEntries(
    ['Button', 'Card', 'CardHeader', 'CardTitle', 'CardDescription', 'CardContent', 'CardFooter']
    .map(name => [name, (...props) => {
      logComponentResolution(name, 'shadcn', { props });
      const Component = getShadcnComponent(name);
      return <Component {...props} />;
    }])
  ),
  
  // Make ALL Lucide icons available through Icons namespace with logging
  Icons: new Proxy(LucideIcons, {
    get: (target, prop) => {
      logComponentResolution(`Icons.${prop}`, 'icon', { exists: !!target[prop] });
      return target[prop] || (() => {
        console.warn(`Icon ${prop} not found`);
        return null;
      });
    }
  }),

  // Simple Link component for basic navigation with logging
  Link: ({ href, children, ...props }) => {
    logComponentResolution('Link', 'basic', { href });
    return <a href={href} {...props}>{children}</a>;
  },

  // Placeholder components with logging
  Placeholder: {
    Image: ({ width, height, label, className = '', ...props }) => {
      logComponentResolution('Placeholder.Image', 'placeholder', { width, height, label });
      return (
        <div
          className={cn(
            'bg-slate-100 dark:bg-slate-800 flex items-center justify-center',
            className
          )}
          style={{ width, height }}
          {...props}
        >
          {label}
        </div>
      );
    },
    Video: ({ width, height, label, className = '', ...props }) => {
      logComponentResolution('Placeholder.Video', 'placeholder', { width, height, label });
      return (
        <div
          className={cn(
            'bg-slate-100 dark:bg-slate-800 flex items-center justify-center',
            className
          )}
          style={{ width, height }}
          {...props}
        >
          {label}
        </div>
      );
    },
    Avatar: ({ size = '64px', label, className = '', ...props }) => {
      logComponentResolution('Placeholder.Avatar', 'placeholder', { size, label });
      return (
        <div
          className={cn(
            'bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center',
            className
          )}
          style={{ width: size, height: size }}
          {...props}
        >
          {label}
        </div>
      );
    }
  }
};

export default SimpleLivePreview; 
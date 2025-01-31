import React, { useState, useEffect, useMemo } from 'react';
import { LiveProvider, LivePreview, LiveError } from 'react-live';
import * as LucideIcons from 'lucide-react';
import * as UIComponents from './ui';
import { createUniversalNamespace } from './utils/createUniversalNamespace';
import * as NavigationMenuPrimitive from '@radix-ui/react-navigation-menu';
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

// Debug flag for development logs
const DEBUG_MODE = process.env.NODE_ENV === 'development';

// 1. Minimal Code Cleaning (Phase 1 from Guide)
const cleanCode = (rawCode) => {
  if (!rawCode) return '';
  
  return rawCode
    // Remove code fences
    .replace(/```[a-z]*\n?/g, '')
    // Remove AI markers
    .replace(/\/\/\/\s*(START|END).*?\n/g, '\n')
    // Remove position markers
    .replace(/\s*(?:position=|=)\w+\s*/g, '\n')
    // Remove any standalone words that aren't part of the code
    .replace(/^[A-Za-z]+(?!\s*[({=])\s*$/gm, '')
    // Clean up multiple newlines
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

// 2. Component Stubs (Phase 2 from Guide)
const createStubComponent = (name, element = 'div', defaultProps = {}) => {
  const Component = React.forwardRef(({ className, children, variant, size, ...props }, ref) => {
    if (DEBUG_MODE) {
      console.log(`🎨 Rendering ${name}`, { className, variant, size, props });
    }
    
    // Enhanced variant and size handling
    let combinedClassName = className || '';
    
    if (variant) {
      const variantMap = {
        outline: 'border border-input bg-transparent hover:bg-accent hover:text-accent-foreground',
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline'
      };
      combinedClassName = `${combinedClassName} ${variantMap[variant] || ''}`.trim();
    }
    
    if (size) {
      const sizeMap = {
        sm: 'h-9 px-3 text-sm',
        md: 'h-10 px-4 py-2',
        lg: 'h-11 px-8'
      };
      combinedClassName = `${combinedClassName} ${sizeMap[size] || ''}`.trim();
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

// 3. Enhanced Error Boundary
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
      return (
        <div 
          data-testid="error-boundary"
          className="p-4 border border-destructive bg-destructive/10 rounded"
        >
          <h3 className="text-destructive font-semibold">Component Error</h3>
          <p className="text-destructive/90 mt-2">{this.state.error?.message}</p>
          {this.state.error?.componentStack && (
            <pre className="mt-4 text-sm text-destructive/80 whitespace-pre-wrap overflow-auto max-h-[200px]">
              {this.state.error.componentStack}
            </pre>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}

// Create our universal component getter
const getShadcnComponent = createUniversalNamespace();

// Special case components that need custom handling
const Placeholder = {
  Image: ({ width = 100, height = 100, text = 'Placeholder' }) => (
    <div 
      style={{ 
        width, 
        height, 
        backgroundColor: '#e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#64748b',
        borderRadius: '0.375rem'
      }}
    >
      {text}
    </div>
  )
};

// Export the essential scope with all components available at top level
const ESSENTIAL_SCOPE = {
  ...React,
  
  // Real navigation components with namespace pattern
  NavigationMenu: Object.assign(NavigationMenu, {
    List: NavigationMenuList,
    Item: NavigationMenuItem,
    Link: NavigationMenuLink,
    Content: NavigationMenuContent,
    Trigger: NavigationMenuTrigger,
    Viewport: NavigationMenuViewport,
  }),
  
  // Other shadcn components through universal namespace
  Button: getShadcnComponent('Button'),
  Card: getShadcnComponent('Card'),
  
  // Special cases that aren't shadcn components
  Icons: {
    ...LucideIcons,
    Logo: LucideIcons.Box
  },

  // Placeholder components
  Placeholder: {
    Image: ({ width, height, label, className = '', ...props }) => (
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
    )
  }
};

// 5. Preview Component
const PreviewComponent = ({ code, scope }) => {
  const cleanedCode = useMemo(() => cleanCode(code), [code]);
  const isStreaming = useMemo(() => !cleanedCode.includes('RootLayout'), [cleanedCode]);

  if (DEBUG_MODE) {
    console.log('🎭 Preview Component:', {
      cleanedCode,
      isStreaming,
      scopeKeys: Object.keys(scope)
    });
  }

  return (
    <div className="w-full h-full bg-background relative isolate overflow-hidden" data-testid="preview-container">
      <LiveProvider
        code={cleanedCode}
        scope={scope}
        noInline={true}
      >
        <EnhancedErrorBoundary data-testid="error-boundary">
          <div className="w-full h-full overflow-auto">
            <LiveError className="text-destructive p-4 bg-destructive/10 rounded mb-4 sticky top-0 z-[100]" data-testid="preview-error" />
            <div 
              className={cn(
                "w-full relative isolate flex flex-col min-h-full",
                isStreaming && "space-y-8 p-4"
              )}
              style={{ 
                isolation: 'isolate', 
                contain: 'layout paint style',
                minHeight: '100vh',
                '--header-layer': '50',
                '--hero-layer': '0',
                '--content-layer': '10'
              }} 
              data-testid="preview-content"
            >
              <LivePreview />
            </div>
          </div>
        </EnhancedErrorBoundary>
      </LiveProvider>
    </div>
  );
};

// 6. Main Component
const SimpleLivePreview = ({ registry, streamingStates }) => {
  const [stableCode, setStableCode] = useState('');

  // Handle streaming state
  const hasStreamingComponents = useMemo(() => 
    streamingStates && 
    Array.from(streamingStates.values()).some(state => state.isStreaming),
    [streamingStates]
  );

  // Compose components
  useEffect(() => {
    if (!registry?.components) return;
    
    const completeComponents = Array.from(registry.components.entries())
      .filter(([id]) => streamingStates.get(id)?.isComplete)
      .map(([_, component]) => component);

    if (completeComponents.length > 0) {
      // Find RootLayout
      const rootLayout = completeComponents.find(c => c.isLayout);
      const otherComponents = completeComponents.filter(c => !c.isLayout);

      // Clean and combine component code without exports
      const componentCode = [
        // Add components without export statements
        ...otherComponents.map(component => {
          const cleanedCode = cleanCode(component.code)
            .replace(/export\s+/, '');
          return cleanedCode;
        }),
        // Add RootLayout last if it exists
        rootLayout ? cleanCode(rootLayout.code).replace(/export\s+/, '') : ''
      ]
        .filter(Boolean)
        .join('\n\n');  // Ensure double newline between components

      // If we have RootLayout, use it. Otherwise, render the last component directly
      const finalCode = rootLayout 
        ? `${componentCode}\n\nrender(<RootLayout />);`
        : `${componentCode}\n\nrender(${
            otherComponents.length > 0 
              ? `<${otherComponents[otherComponents.length - 1].name} />`
              : '<div />'
          });`;

      if (DEBUG_MODE) {
        console.log('📦 Final Code:', {
          hasRootLayout: !!rootLayout,
          componentCount: otherComponents.length,
          code: finalCode
        });
      }

      setStableCode(finalCode);
    }
  }, [registry?.components, streamingStates]);

  if (!registry?.components) {
    return (
      <div className="p-4 text-muted-foreground bg-muted rounded-lg">
        <span>Ready to generate components</span>
      </div>
    );
  }

  return (
    <div 
      className="h-full flex flex-col bg-background rounded-lg overflow-hidden relative" 
      style={{ 
        isolation: 'isolate', 
        contain: 'layout paint style',
        minHeight: '100vh'
      }}
    >
      <div className="text-sm p-2 bg-muted border-b sticky top-0 z-[100]">
        Live Preview
      </div>
      <div className="flex-1 relative overflow-hidden">
        <div className="absolute inset-0">
          {hasStreamingComponents && !stableCode && (
            <div className="p-4 text-muted-foreground bg-muted rounded-lg mb-4">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-current" />
                <span>Generating components...</span>
              </div>
            </div>
          )}
          {stableCode && (
            <PreviewComponent 
              code={stableCode}
              scope={ESSENTIAL_SCOPE}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default SimpleLivePreview; 
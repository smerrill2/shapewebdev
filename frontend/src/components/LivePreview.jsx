import React, { useMemo } from 'react';
import { LiveProvider, LivePreview as ReactLivePreview, LiveError } from 'react-live';
import * as LucideIcons from 'lucide-react';
import * as UIComponents from './ui';
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuContent,
  NavigationMenuTrigger,
  NavigationMenuLink,
  NavigationMenuViewport,
} from './ui/navigation-menu';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { cn } from './utils/cn';
import { applyTransformations } from './transform/applyTransformations';
import { useComponentRegistry } from './streaming/useComponentRegistry';
import { useSSEListener } from './streaming/useSSEListener';

// Debug flag for development logs
const DEBUG_MODE = process.env.NODE_ENV === 'development';

// Connection Status Component
const ConnectionStatus = ({ isConnected, onRetry }) => (
  <div className={cn(
    'px-2 py-1 rounded-full text-sm font-medium inline-flex items-center gap-2',
    isConnected 
      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
  )}>
    <div className={cn(
      'w-2 h-2 rounded-full',
      isConnected ? 'bg-green-500' : 'bg-red-500'
    )} />
    {isConnected ? 'Connected' : (
      <>
        Disconnected
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onRetry}
          className="ml-2 h-6 px-2 text-xs"
        >
          Retry
        </Button>
      </>
    )}
  </div>
);

// Loading Component
const LoadingComponent = ({ componentId }) => (
  <div className="animate-pulse space-y-4 p-4 border rounded-lg bg-muted/50">
    <div className="h-4 bg-muted rounded w-3/4"></div>
    <div className="space-y-2">
      <div className="h-3 bg-muted rounded w-1/2"></div>
      <div className="h-3 bg-muted rounded w-2/3"></div>
    </div>
    <div className="text-xs text-muted-foreground">Loading component: {componentId}...</div>
  </div>
);

// Enhanced Error Boundary
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
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Try Again
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Export the essential scope with all components available at top level
const ESSENTIAL_SCOPE = {
  ...React,
  ...UIComponents,
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuContent,
  NavigationMenuTrigger,
  NavigationMenuViewport,
  Button,
  Card,
  Icons: {
    ...LucideIcons,
    Logo: LucideIcons.Box
  },
  cn,
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

// Preview Component
const PreviewComponent = ({ components }) => {
  const { code, incompleteComponents } = useMemo(() => {
    const incomplete = new Set();
    const code = Object.entries(components)
      .map(([id, component]) => {
        if (!component.isComplete) {
          incomplete.add(id);
        }
        const transformedCode = applyTransformations(component.code, { testId: id });
        console.log('🎭 Component Code:', { id, code: component.code, transformedCode });
        return transformedCode;
      })
      .join('\n\n');
    
    console.log('🎭 Final Code for React-Live:', code);
    
    return { code, incompleteComponents: incomplete };
  }, [components]);

  return (
    <div className="space-y-4" data-testid="preview-container">
      {/* Show loading states for incomplete components */}
      {Array.from(incompleteComponents).map(id => (
        <LoadingComponent key={id} componentId={id} />
      ))}

      {/* Render complete components */}
      <div className="w-full h-full bg-background relative isolate">
        <LiveProvider
          code={code}
          scope={ESSENTIAL_SCOPE}
          noInline={false}
        >
          <EnhancedErrorBoundary data-testid="error-boundary">
            <div className="w-full h-full overflow-auto">
              <LiveError 
                className="text-destructive p-4 bg-destructive/10 rounded mb-4 sticky top-0 z-10" 
                data-testid="preview-error" 
              />
              <div data-testid="live-preview-content">
                <ReactLivePreview className="w-full relative" data-testid="preview-content" />
              </div>
            </div>
          </EnhancedErrorBoundary>
        </LiveProvider>
      </div>
    </div>
  );
};

// Main Component
export const LivePreview = ({ endpoint = '/api/generate', registry: providedRegistry }) => {
  const defaultRegistry = useComponentRegistry();
  const registry = providedRegistry || defaultRegistry;
  // Only use SSE listener if endpoint is provided
  const { isConnected, connect } = endpoint ? useSSEListener(endpoint, registry) : { isConnected: false, connect: () => {} };

  const components = registry.getComponents();
  const hasComponents = Object.keys(components).length > 0;

  return (
    <div className="space-y-4">
      {/* Only show connection status if endpoint is provided */}
      {endpoint && (
        <div className="flex items-center justify-between p-2 bg-background border rounded">
          <ConnectionStatus isConnected={isConnected} onRetry={connect} />
          {hasComponents && (
            <div className="text-sm text-muted-foreground">
              {Object.keys(components).length} component(s) loaded
            </div>
          )}
        </div>
      )}

      {/* Main content */}
      {!hasComponents ? (
        <div className="p-8 text-center text-muted-foreground bg-muted/50 rounded-lg" data-testid="live-preview-content">
          <LucideIcons.Code className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">Ready to Generate Components</p>
          <p className="text-sm mt-2">
            {endpoint ? 'Waiting for component stream to start...' : 'Use the controls above to add components'}
          </p>
        </div>
      ) : (
        <PreviewComponent components={components} />
      )}
    </div>
  );
}; 
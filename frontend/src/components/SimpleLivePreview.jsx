import React, { useState, useEffect, useMemo } from 'react';
import { LiveProvider, LivePreview, LiveError } from 'react-live';
import * as LucideIcons from 'lucide-react';
import * as UIComponents from './ui';
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
import { Button } from './ui/button';
import { Card } from './ui/card';
import { cn } from './utils/cn';
import { applyTransformations } from './transform/applyTransformations';
import { cleanCode } from './transform/cleanCode';

// Debug flag for development logs
const DEBUG_MODE = process.env.NODE_ENV === 'development';

// 1. Minimal Code Cleaning
// const cleanCode = (rawCode) => {
//   if (!rawCode) return '';
//   
//   return rawCode
//     // Remove code fences
//     .replace(/```[a-z]*\n?/g, '')
//     // Remove AI markers but preserve code structure
//     .replace(/\/\/\/\s*(START|END).*?(?=\n|$)/g, '')
//     // Remove position markers but preserve code structure
//     .replace(/\s*(?:position=|=)\w+(?=[\s>])/g, '')
//     // Clean up multiple newlines
//     .replace(/\n{3,}/g, '\n\n')
//     .trim();
// };

// 2. Enhanced Error Boundary
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
  
  // Real navigation components
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuContent,
  NavigationMenuTrigger,
  NavigationMenuViewport,
  
  // Other shadcn components
  Button,
  Card,
  
  // Icons
  Icons: {
    ...LucideIcons,
    Logo: LucideIcons.Box
  },

  // Utilities
  cn,

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

// 3. Preview Component
const PreviewComponent = ({ components }) => {
  const combinedCode = useMemo(() => {
    const code = Array.from(components.values())
      .map(component => {
        // Apply transformations with test ID
        const transformedCode = applyTransformations(component.code, { testId: component.id });
        
        // Debug log the transformed code
        if (DEBUG_MODE) {
          console.log('🎭 Transformed Code:', {
            id: component.id,
            code: transformedCode
          });
        }
        
        return transformedCode;
      })
      .join('\n\n');
    
    // Debug log the final code
    if (DEBUG_MODE) {
      console.log('🎭 Final Code for React-Live:', code);
    }
    
    return code;
  }, [components]);

  if (DEBUG_MODE) {
    console.log('🎭 Preview Component:', {
      combinedCode,
      componentCount: components.size,
      componentIds: Array.from(components.keys())
    });
  }

  return (
    <div className="w-full h-full bg-background relative isolate" data-testid="preview-container">
      <LiveProvider
        code={combinedCode}
        scope={ESSENTIAL_SCOPE}
        noInline={false}
      >
        <EnhancedErrorBoundary data-testid="error-boundary">
          <div className="w-full h-full overflow-auto">
            <LiveError className="text-destructive p-4 bg-destructive/10 rounded mb-4 sticky top-0 z-10" data-testid="preview-error" />
            <div data-testid="live-preview-content">
              <LivePreview className="w-full relative" data-testid="preview-content" />
            </div>
          </div>
        </EnhancedErrorBoundary>
      </LiveProvider>
    </div>
  );
};

// 4. Main Component
const SimpleLivePreview = ({ registry, streamingStates }) => {
  const [components, setComponents] = useState(new Map());

  // Handle streaming state
  const hasStreamingComponents = useMemo(() => 
    streamingStates && 
    Array.from(streamingStates.values()).some(state => state.isStreaming),
    [streamingStates]
  );

  // Handle component updates
  useEffect(() => {
    if (!registry?.components) return;
    
    // Get all components, including those that are still streaming
    const allComponents = Array.from(registry.components.entries())
      .map(([id, component]) => ({ id, ...component }));

    // Update components map immediately
    const newComponents = new Map();
    allComponents.forEach(component => {
      newComponents.set(component.id, component);
    });
    setComponents(newComponents);
  }, [registry?.components]);

  // Debug logging
  useEffect(() => {
    console.log('SimpleLivePreview - registry.components updated:', registry?.components);
  }, [registry?.components]);

  useEffect(() => {
    if (DEBUG_MODE) {
      console.log('🔄 Component Update:', {
        componentCount: components.size,
        componentIds: Array.from(components.keys()),
        streamingStates: streamingStates ? Object.fromEntries(streamingStates) : null
      });
    }
  }, [components, streamingStates]);

  if (!registry?.components) {
    return (
      <div className="p-4 text-muted-foreground bg-muted rounded-lg" data-testid="live-preview-content">
        <span>Ready to generate components</span>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background rounded-lg overflow-hidden relative isolate" data-testid="live-preview">
      <div className="text-sm p-2 bg-muted border-b sticky top-0 z-10">
        Live Preview
      </div>
      <div className="flex-1 relative">
        <div className="absolute inset-0">
          {hasStreamingComponents && registry.components.size === 0 && (
            <div className="p-4 text-muted-foreground bg-muted rounded-lg mb-4" data-testid="live-preview-content">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-current" />
                <span>Generating components...</span>
              </div>
            </div>
          )}
          {registry.components.size === 0 && !hasStreamingComponents && (
            <div className="p-4 text-muted-foreground bg-muted rounded-lg" data-testid="live-preview-content">
              <span>Ready to generate components</span>
            </div>
          )}
          {registry.components.size > 0 && (
            <PreviewComponent components={registry.components} />
          )}
        </div>
      </div>
    </div>
  );
};

export default SimpleLivePreview; 
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { LiveProvider, LivePreview, LiveError } from 'react-live';
import * as LucideIcons from 'lucide-react';

// Import all UI components dynamically
import * as UIComponents from './ui';

// Debug flag for development logs
const DEBUG_MODE = process.env.NODE_ENV === 'development';

// Error Boundary for catching component-level errors
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Component Error:', {
      message: error.message,
      componentStack: errorInfo.componentStack,
      code: this.props.children?.props?.code,
      fullError: error
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 border border-red-300 bg-red-50 rounded">
          <h3 className="text-red-700">Component Error</h3>
          <p className="text-red-600">{this.state.error?.message}</p>
          <pre className="mt-2 text-sm text-red-500 whitespace-pre-wrap">
            {this.state.error?.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

// Create placeholder factory
const createPlaceholder = (IconComponent, defaultLabel) => 
  ({ width = '100%', height = '300px', label = defaultLabel, className = '', isBackground = false, ...props }) => (
    <div 
      style={{ 
        width, 
        height,
        position: isBackground ? 'absolute' : 'relative',
        zIndex: isBackground ? -1 : 'auto',
        top: isBackground ? 0 : 'auto',
        left: isBackground ? 0 : 'auto',
        right: isBackground ? 0 : 'auto',
        bottom: isBackground ? 0 : 'auto'
      }}
      className={`bg-slate-200 rounded-lg flex items-center justify-center ${className}`}
      {...props}
    >
      <div className="text-slate-500 flex flex-col items-center gap-2">
        <IconComponent className="w-8 h-8" />
        <span>{label}</span>
      </div>
    </div>
  );

// Placeholder icons
const PlaceholderIcons = {
  Image: (props) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  Video: (props) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  ),
  Avatar: (props) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  )
};

// Optimized Placeholder components
const Placeholder = {
  Image: createPlaceholder(PlaceholderIcons.Image, 'Image'),
  Video: createPlaceholder(PlaceholderIcons.Video, 'Video'),
  Avatar: createPlaceholder(PlaceholderIcons.Avatar, 'Avatar')
};

// Define NavigationMenu fallbacks once
const NAV_FALLBACKS = {
  Root: ({ children, className = '', ...props }) => (
    <nav className={`relative z-10 flex items-center ${className}`} {...props}>
      {children}
    </nav>
  ),
  List: ({ children, className = '', ...props }) => (
    <ul className={`group flex flex-1 list-none items-center justify-center space-x-1 ${className}`} {...props}>
      {children}
    </ul>
  ),
  Item: ({ children, className = '', ...props }) => (
    <li className={`flex items-center ${className}`} {...props}>
      {children}
    </li>
  ),
  Link: ({ children, className = '', ...props }) => (
    <a className={`block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground ${className}`} {...props}>
      {children}
    </a>
  ),
  Trigger: ({ children, className = '', ...props }) => (
    <button className={`group inline-flex h-10 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50 ${className}`} {...props}>
      {children}
    </button>
  ),
  Content: ({ children, className = '', ...props }) => (
    <div className={`absolute left-0 top-0 w-full ${className}`} {...props}>
      {children}
    </div>
  )
};

// Create effective NavigationMenu by merging UI components with fallbacks
const effectiveNav = UIComponents.NavigationMenu 
  ? { ...NAV_FALLBACKS, ...UIComponents.NavigationMenu } 
  : NAV_FALLBACKS;

// Use effectiveNav for both validation and runtime
const NAVIGATION_MENU_COMPONENTS = UIComponents.NavigationMenu || NAV_FALLBACKS;

// Create base scope with validated components
const BASE_SCOPE = {
  ...React,
  ...UIComponents,
  // Add Button and its compound components
  Button: {
    ...UIComponents.Button,
    Root: UIComponents.Button?.Root || (({ children, className = '', ...props }) => (
      <button 
        className={`px-4 py-2 rounded bg-primary text-primary-foreground hover:bg-primary/90 ${className}`}
        {...props}
      >
        {children}
      </button>
    )),
    Content: ({ children, className = '', ...props }) => (
      <span className={className} {...props}>{children}</span>
    ),
    Icon: ({ children, className = '', ...props }) => (
      <span className={`button-icon ${className}`} {...props}>{children}</span>
    )
  },
  NavigationMenu: {
    Root: UIComponents.NavigationMenu?.Root || NAV_FALLBACKS.Root,
    List: UIComponents.NavigationMenu?.List || NAV_FALLBACKS.List,
    Item: UIComponents.NavigationMenu?.Item || NAV_FALLBACKS.Item,
    Link: UIComponents.NavigationMenu?.Link || NAV_FALLBACKS.Link,
    Trigger: UIComponents.NavigationMenu?.Trigger || NAV_FALLBACKS.Trigger,
    Content: UIComponents.NavigationMenu?.Content || NAV_FALLBACKS.Content
  },
  Icons: {
    // First spread any existing icons from LucideIcons
    ...Object.entries(LucideIcons).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = value;
      } else if (DEBUG_MODE) {
        console.warn(`⚠️ Warning: Icon ${key} is undefined`);
      }
      return acc;
    }, {}),
    // Then add any common aliases or custom icons
    Logo: LucideIcons.Home, // Use Home icon as fallback for Logo
    Menu: LucideIcons.Menu,
    Close: LucideIcons.X,
    ChevronDown: LucideIcons.ChevronDown,
    ChevronRight: LucideIcons.ChevronRight
  },
  Placeholder
};

// Debug validation of components
if (DEBUG_MODE) {
  console.log('Available Components:', {
    Button: !!BASE_SCOPE.Button,
    NavigationMenu: !!BASE_SCOPE.NavigationMenu,
    Icons: Object.keys(BASE_SCOPE.Icons),
    UIComponents: Object.keys(UIComponents)
  });
}

// Helper function to transform component references in code
function transformComponentReferences(code) {
  if (!code) return '';
  
  // First transform compound components to their simple versions
  let transformed = code
    // Transform Button.Root to Button with multi-line support
    .replace(/<Button\.Root([^>]*)>([\s\S]*?)<\/Button\.Root>/g, '<Button$1>$2</Button>')
    // Transform Button.Content to span
    .replace(/<Button\.Content([^>]*)>([\s\S]*?)<\/Button\.Content>/g, '<span$1>$2</span>')
    // Transform Button.Icon to span with icon class
    .replace(/<Button\.Icon([^>]*)>([\s\S]*?)<\/Button\.Icon>/g, '<span class="button-icon"$1>$2</span>')
    // Replace min-h-screen with h-full
    .replace(/(className=["'][^"']*?)min-h-screen/g, '$1h-full');
  
  // Get available component names
  const availableComponents = Object.keys(BASE_SCOPE).filter(key => key !== 'default');
  const navigationMenuComponents = Object.keys(NAVIGATION_MENU_COMPONENTS);
  
  // Add Button compound components to validation
  const buttonComponents = ['Root', 'Content', 'Icon'].map(sub => `Button.${sub}`);
  
  // Helper function to ensure proper tag closure for self-closing and full tags
  const replaceComponentTag = (match, tagName, attrs = '', children = '') => {
    // Skip transformation for known compound components
    if (buttonComponents.includes(tagName)) {
      return match;
    }

    const hasChildren = children && children.trim();
    const isSelfClosing = match.endsWith('/>') || !hasChildren;

    // Create error message
    const errorMessage = `<div className="error-component bg-red-50 p-2 rounded border border-red-200">
      <span className="text-red-600">${tagName} is undefined</span>
      ${hasChildren ? `<div className="mt-1 text-sm text-red-500">${children}</div>` : ''}
    </div>`;

    // Process nested components in children recursively
    const processedChildren = hasChildren ? transformComponentReferences(children) : '';
    
    return isSelfClosing ? errorMessage : 
      `<div className="error-wrapper">${errorMessage}${processedChildren}</div>`;
  };
  
  // First, handle NavigationMenu subcomponents
  navigationMenuComponents.forEach(subComponent => {
    if (!NAVIGATION_MENU_COMPONENTS[subComponent]) {
      const fullName = `NavigationMenu.${subComponent}`;
      // Improved regex pattern for nested JSX
      const pattern = new RegExp(
        `<${fullName}((?:\\s+[^>]*)?)>([^<]*(?:<(?!\/${fullName}>)[^<]*)*)<\/${fullName}>|<${fullName}(\\s[^>]*?)?\/>`,
        'gs'
      );

      transformed = transformed.replace(pattern, (match, p1, p2, p3) => {
        const attrs = p1 || p3 || '';
        const children = p2 || '';
        return replaceComponentTag(match, fullName, attrs, children);
      });
    }
  });
  
  // Then handle other components with improved regex
  availableComponents.forEach(component => {
    if (!BASE_SCOPE[component]) {
      console.warn(`⚠️ Warning: Using undefined component ${component}`);
      
      // Improved regex pattern for nested JSX
      const pattern = new RegExp(
        `<${component}((?:\\s+[^>]*)?)>([^<]*(?:<(?!\/${component}>)[^<]*)*)<\/${component}>|<${component}(\\s[^>]*?)?\/>`,
        'gs'
      );
      
      transformed = transformed.replace(pattern, (match, p1, p2, p3) => {
        const attrs = p1 || p3 || '';
        const children = p2 || '';
        return replaceComponentTag(match, component, attrs, children);
      });
    }
  });
  
  // Preserve whitespace and indentation between tags
  transformed = transformed.replace(/>\s+</g, (match) => {
    // Count newlines and spaces to preserve formatting
    const newlines = (match.match(/\n/g) || []).length;
    const spaces = match.match(/\s+$/)?.[0]?.length || 0;
    return '>' + '\n'.repeat(newlines) + ' '.repeat(spaces) + '<';
  });
  
  // Smarter fragment wrapping that checks for existing fragments
  transformed = transformed.replace(
    /return\s*\(\s*([\s\S]*?)\s*\)/g,
    (match, content) => {
      // Check if content is already wrapped in fragments
      if (content.trim().startsWith('<>') && content.trim().endsWith('</>')) {
        return `return (${content})`;
      }
      // Preserve indentation
      const indentation = content.match(/^\s*/)?.[0] || '';
      const indentedContent = content.split('\n')
        .map(line => line.trim() ? indentation + '  ' + line : '')
        .filter(Boolean)
        .join('\n');
      return `return (<>\n${indentedContent}\n${indentation}</>)`;
    }
  );
  
  // Debug log the transformed code
  if (DEBUG_MODE) {
    console.log('🔄 Transformed code:', transformed);
  }
  
  return transformed;
}

// Update cleanAndTransformCode to handle component definitions
function cleanAndTransformCode(code) {
  if (!code) return '';
  
  // 1) Remove any malformed headers or prefixes
  let cleaned = code.replace(/^=\w+\s*/m, '');
  
  // 2) Fix nested function declarations
  cleaned = cleaned.replace(
    /const\s+(\w+)\s*=\s*function\(\)\s*{\s*const\s+Component\s*=\s*function\(\)\s*{([\s\S]*?)};?\s*}/g,
    'const $1 = function() {$2}'
  );
  
  // 3) Clean out any metadata lines or leading/trailing quotes
  cleaned = cleaned
    // Remove markdown code blocks while preserving indentation
    .replace(/^```[a-z]*\n|\n```$/g, '')
    // Remove position markers with proper word boundaries
    .replace(/\bposition=\w+\b/g, '')
    // Remove START/END markers with proper component name capture
    .replace(/^\/\/\/\s*(START|END)\s+([\w-]+)(?:\s+position=[\w-]+)?\s*$/gm, '')
    // Remove any trailing/leading quotes while preserving indentation
    .replace(/^["']\s*|\s*["']$/g, '')
    .trim();

  // 4) Remove ALL possible ui declarations/imports while preserving structure
  cleaned = cleaned
    // Remove import * as ui
    .replace(/^import\s+\*\s+as\s+ui\s+from\s+['"].*['"];?\s*$/gm, '')
    // Remove import { ui }
    .replace(/^import\s+\{\s*ui(\s+as\s+[\w]+)?\s*\}\s+from\s+['"].*['"];?\s*$/gm, '')
    // Remove const/let/var ui declarations
    .replace(/^(const|let|var)\s+ui\s*=\s*[^;]+;?\s*$/gm, '')
    // Remove ui destructuring
    .replace(/^(const|let|var)\s+\{\s*ui(\s+as\s+[\w]+)?\s*\}[\s=][^;]+;?\s*$/gm, '')
    // Remove require statements
    .replace(/^const\s+ui\s*=\s*require\(['"].*['"]\);?\s*$/gm, '')
    .trim();

  // 5) Transform export statements to simple declarations while preserving indentation
  cleaned = cleaned
    // Handle function declarations (both default and non-default)
    .replace(/^(\s*)export\s+(?:default\s+)?function\s+(\w+)/gm, '$1const $2 = function')
    // Handle arrow function declarations
    .replace(/^(\s*)export\s+(?:default\s+)?const\s+(\w+)\s*=\s*(\([^)]*\)|[^=]*)\s*=>/gm, '$1const $2 = $3 =>')
    // Handle other const declarations
    .replace(/^(\s*)export\s+(?:default\s+)?const\s+(\w+)\s*=/gm, '$1const $2 =')
    // Remove any remaining export statements
    .replace(/^(\s*)export\s+{[^}]+};?\s*$/gm, '')
    .replace(/^(\s*)export\s+default\s+/gm, '$1')
    .trim();

  // 6) Validate and transform component references
  cleaned = transformComponentReferences(cleaned);
  
  // 7) Format component function declarations
  cleaned = cleaned
    // Main function-to-arrow transformation with enhanced capture
    .replace(
      /const\s+(\w+)\s*=\s*function\s*\(\)\s*{\s*return\s*\(\s*([\s\S]+?)\s*\);\s*};?/m,
      (match, componentName, jsxContent) => {
        // More aggressive cleanup of trailing punctuation and whitespace
        let cleanedJSX = jsxContent
          // First remove any trailing `);` with optional whitespace/newlines
          .replace(/\);\s*}\s*$/g, '')     // Handle case with closing brace
          .replace(/\);\s*$/g, '')         // Handle normal case
          // Then remove any standalone semicolons
          .replace(/;\s*$/g, '')
          // Clean up any fragment closings with semicolons
          .replace(/<\/>\s*;\s*$/g, '</>')
          .trim();

        return `const ${componentName} = () => (\n  ${cleanedJSX}\n);`;
      }
    )
    // Handle single-line return statements with same thorough cleanup
    .replace(
      /const\s+(\w+)\s*=\s*function\(\)\s*{\s*return\s*([^;]+?)\s*;?\s*};/g,
      (match, componentName, returnValue) => {
        let cleanedValue = returnValue
          .replace(/\);\s*}\s*$/g, '')
          .replace(/\);\s*$/g, '')
          .replace(/;\s*$/g, '')
          .replace(/<\/>\s*;\s*$/g, '</>')
          .trim();

        return `const ${componentName} = () => (\n  ${cleanedValue}\n);`;
      }
    );

  // Additional validation layer to catch any remaining returns in arrow functions
  cleaned = cleaned
    // Remove returns in arrow functions with double parens
    .replace(/=>\s*\(\s*return\s*\(\s*/g, '=> ((')
    // Remove returns in arrow functions with single parens
    .replace(/=>\s*\(\s*return\s+/g, '=> (')
    // Remove returns in arrow functions with blocks
    .replace(/=>\s*{\s*return\s+/g, '=> {')
    // Enforce semicolons after arrow functions
    .replace(/(const\s+\w+\s*=\s*\(\)\s*=>\s*\([^;]*)\)(\s*)(?!;)/g, '$1);')
    // Final cleanup of any problematic fragment closings
    .replace(/<\/>\s*;\s*\n\s*\);/g, '</>\n);')
    .replace(/<\/>\s*;\s*\);/g, '</>\n);');

  // 8) Ensure proper semicolons and formatting
  cleaned = cleaned
    // Add missing semicolons after component definitions
    .replace(/}\s*$/, '};')
    // Add missing semicolons after const declarations
    .replace(/^(\s*const\s+\w+\s*=\s*[^;{]+)$/gm, '$1;')
    // Clean up any double semicolons
    .replace(/;;+/g, ';')
    // Clean up any fragment closings with extra semicolons
    .replace(/<\/>\s*;\s*\n\s*\);/g, '</>\n);')
    // Preserve empty lines between logical blocks
    .replace(/;\n+/g, ';\n\n')
    .trim();

  // Debug log the cleaned code
  if (DEBUG_MODE) {
    console.log('🧹 Cleaned code:', cleaned);
  }
  
  return cleaned;
}

// PreviewComponent for better style handling
const PreviewComponent = ({ code, scope }) => {
  // Memoize the enhanced scope to prevent unnecessary re-renders
  const enhancedScope = useMemo(() => ({
    ...scope,
    // Only add base styles to scope, not to every component
    className: "antialiased",
    style: { overflow: 'auto', position: 'relative' }
  }), [scope]);

  // Memoize the code transformation
  const transformedCode = useMemo(() => {
    if (!code) return '';
    
    // Only transform specific layout-related classes
    return code
      // Replace min-h-screen with h-full only on layout containers
      .replace(/className=["']([^"']*\b)(min-h-screen)(\b[^"']*)["']/g, 'className="$1h-full$3"')
      // Scope sticky positioning to container
      .replace(/sticky\s+top-0/g, 'sticky top-0')
      .replace(/z-50/g, 'z-10')
      // Add container classes only to root div and main layout elements
      .replace(
        /(<div\s+className=["'])([^"']*)(["']\s*>[\s\S]*?<\/div>)/g, 
        (match, start, classes, end) => {
          // Only add layout classes to root/container divs
          if (classes.includes('container') || classes.includes('bg-background')) {
            return `${start}w-full h-full relative ${classes}${end}`;
          }
          return match;
        }
      );
  }, [code]);

  return (
    <div className="w-full h-full bg-background relative isolate">
      <LiveProvider
        code={transformedCode}
        scope={enhancedScope}
        noInline
      >
        <ErrorBoundary>
          <div className="w-full h-full overflow-auto">
            <LiveError className="text-destructive p-4 bg-destructive/10 rounded mb-4 sticky top-0 z-10" />
            <LivePreview className="w-full relative" />
          </div>
        </ErrorBoundary>
      </LiveProvider>
    </div>
  );
};

const SimpleLivePreview = ({ registry, streamingStates }) => {
  DEBUG_MODE && console.log('🚀 SimpleLivePreview rendered:', { 
    hasRegistry: !!registry, 
    registrySize: registry?.components?.size,
    hasStreamingStates: !!streamingStates,
    streamingStatesSize: streamingStates?.size
  });

  const [renderCode, setRenderCode] = useState('');
  const [stableCode, setStableCode] = useState('');

  // Move getDependencyGraph inside component since it uses useCallback
  const getDependencyGraph = useCallback((components) => {
    const graph = new Map();
    const componentNames = components.map(c => c.name);
    const componentPattern = new RegExp(`<(${componentNames.join('|')})\\b|{\\s*(${componentNames.join('|')})\\s*}`, 'g');

    components.forEach(comp => {
      const matches = comp.code.match(componentPattern) || [];
      const deps = new Set(
        matches.map(match => match.replace(/[<{}\s]/g, ''))
          .filter(name => componentNames.includes(name))
      );
      DEBUG_MODE && console.log(`Dependencies for ${comp.name}:`, Array.from(deps));
      graph.set(comp.name, deps);
    });
    return graph;
  }, []);

  // Memoize these values to prevent unnecessary recalculations
  const hasStreamingComponents = useMemo(() => 
    streamingStates && 
    Array.from(streamingStates.values()).some(state => state.isStreaming),
    [streamingStates]
  );

  const hasCompleteComponents = useMemo(() => 
    streamingStates && 
    Array.from(streamingStates.values()).some(state => state.isComplete),
    [streamingStates]
  );

  // Move getCompleteComponents inside component since it uses getDependencyGraph
  const getCompleteComponents = useCallback(() => {
    if (!registry?.components || !streamingStates) {
      DEBUG_MODE && console.log('⚠️ Missing registry or streamingStates');
      return [];
    }
    
    console.log('🔍 Registry entries:', Array.from(registry.components.entries()));
    console.log('🔍 Streaming states:', Object.fromEntries(streamingStates));
    
    const components = [];
    const graph = getDependencyGraph(Array.from(registry.components.values()));
    console.log('📊 Full dependency graph:', Object.fromEntries(graph));
    
    // First pass: collect all components regardless of dependencies
    const allComponents = new Map();
    for (const [id, component] of registry.components.entries()) {
      const streamingState = streamingStates.get(id);
      
      // Clean up code and validate
      let cleanCode = component.code
        ?.replace(/```[a-z]*\n?/g, '') // Remove markdown code blocks
        .replace(/position=\w+\s*/, '') // Remove position markers
        .replace(/^\/\/\/\s*(START|END)\s+[\w]+.*$/gm, '') // Remove START/END markers
        .trim();

      if (cleanCode && streamingState?.isComplete) {
        allComponents.set(component.name, {
          ...component,
          code: cleanCode
        });
      }
    }

    console.log('🗃️ All available components:', Array.from(allComponents.keys()));

    // Second pass: check dependencies
    for (const [name, component] of allComponents.entries()) {
      const deps = graph.get(name) || new Set();
      const depsComplete = Array.from(deps).every(depName => allComponents.has(depName));
      
      console.log(`Checking ${name} dependencies:`, {
        deps: Array.from(deps),
        depsComplete,
        available: Array.from(allComponents.keys())
      });

      if (depsComplete) {
        components.push(component);
      }
    }

    console.log('📦 Complete components with satisfied dependencies:', components);
    return components;
  }, [registry, streamingStates, getDependencyGraph]);

  // Move composeLayout inside component since it uses getCompleteComponents
  const composeLayout = useCallback(() => {
    if (!registry?.components) return '';

    try {
      const completeComponents = getCompleteComponents();
      console.log('✅ Got complete components:', {
        count: completeComponents.length,
        components: completeComponents.map(c => ({
          name: c.name,
          hasCode: !!c.code,
          isLayout: c.isLayout
        }))
      });
      
      if (completeComponents.length === 0) {
        console.log('⚠️ No complete components yet');
        return '';
      }

      const rootLayout = completeComponents.find(c => c.isLayout);
      console.log('🏗️ Root layout status:', {
        exists: !!rootLayout,
        hasCode: !!rootLayout?.code
      });

      const componentCode = completeComponents
        .filter(component => !component.isLayout)
        .sort((a, b) => {
          // Handle multi-line component references
          const aUsesB = a.code.includes(b.name) || new RegExp(`<${b.name}\\b`, 's').test(a.code);
          const bUsesA = b.code.includes(a.name) || new RegExp(`<${a.name}\\b`, 's').test(b.code);
          if (aUsesB) return 1;
          if (bUsesA) return -1;
          return 0;
        })
        .map(component => {
          const cleanedCode = cleanAndTransformCode(component.code);
          // Ensure each component definition ends with a semicolon
          return cleanedCode.endsWith(';') ? cleanedCode : `${cleanedCode};`;
        })
        .join('\n\n')
        .trim();

      if (rootLayout?.code) {
        let rootLayoutCode = cleanAndTransformCode(rootLayout.code);
        // Single-pass transformation for RootLayout to prevent double returns
        rootLayoutCode = rootLayoutCode.replace(
          /const\s+RootLayout\s*=\s*function\s*\(\)\s*{\s*return\s*\(\s*([\s\S]+?)\s*\);\s*};?/m,
          'const RootLayout = () => ($1);'
        );

        // Ensure RootLayout ends with a semicolon
        if (!rootLayoutCode.trim().endsWith(';')) {
          rootLayoutCode = rootLayoutCode.trim() + ';';
        }

        const code = `
// Component definitions
${componentCode}

// Root layout
${rootLayoutCode}

// Required render call
render(<RootLayout />);
`;
        DEBUG_MODE && console.log('✨ Generated code:', code);
        return code;
      }

      const code = `
// Component definitions
${componentCode}

// Root layout component
const RootLayout = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {${completeComponents
          .filter(c => !c.isLayout)
          .map(c => `<${c.name} />`)
          .join('\n        ')}}
      </div>
    </div>
  );
};

// Required render call
render(<RootLayout />);
`;
      DEBUG_MODE && console.log('✨ Generated code with fallback layout');
      return code;
    } catch (error) {
      console.error('❌ Error composing layout:', error);
      return '';
    }
  }, [registry, streamingStates, getCompleteComponents]);

  // Update render code only when streaming states or registry actually change
  useEffect(() => {
    if (!registry?.components) return;
    
    // Get all complete components
    const completeComponents = Array.from(registry.components.entries())
      .filter(([id]) => {
        const state = streamingStates.get(id);
        return state?.isComplete;
      })
      .map(([_, component]) => component);

    if (completeComponents.length > 0) {
      // If we have the root layout, use it to compose
      const rootLayout = completeComponents.find(c => c.isLayout);
      
      if (rootLayout) {
        const code = composeLayout();
        if (code) {
          setRenderCode(code);
          setStableCode(code);
        }
      } else {
        // Otherwise, create a temporary layout with completed components
        const componentCode = completeComponents
          .map(component => {
            const cleanedCode = cleanAndTransformCode(component.code);
            return cleanedCode.endsWith(';') ? cleanedCode : `${cleanedCode};`;
          })
          .join('\n\n');

        const tempLayoutCode = `
// Component definitions
${componentCode}

// Temporary layout
const RootLayout = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        ${completeComponents.map(c => `<${c.name} />`).join('\n        ')}
      </div>
    </div>
  );
};

// Required render call
render(<RootLayout />);`;

        setRenderCode(tempLayoutCode);
        setStableCode(tempLayoutCode);
      }
    }
  }, [registry?.components?.size, streamingStates?.size, composeLayout]);

  // Early return for empty registry
  if (!registry?.components) {
    DEBUG_MODE && console.log('❌ Early return: No registry');
    return (
      <div className="p-4 text-muted-foreground bg-muted rounded-lg">
        <span>Ready to generate components</span>
      </div>
    );
  }

  DEBUG_MODE && console.log('🎨 Rendering with:', {
    hasStreamingComponents,
    hasRenderCode: !!renderCode,
    hasStableCode: !!stableCode
  });

  return (
    <div className="h-full flex flex-col bg-background rounded-lg overflow-hidden relative isolate">
      <div className="text-sm p-2 bg-muted border-b sticky top-0 z-10">
        Live Preview
      </div>
      <div className="flex-1 relative">
        {/* Preview container that acts as viewport */}
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
              scope={BASE_SCOPE}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default SimpleLivePreview; 
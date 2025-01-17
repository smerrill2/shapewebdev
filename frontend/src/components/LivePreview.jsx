import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import { twMerge as cn } from 'tailwind-merge';
import * as lucideIcons from 'lucide-react';
import * as Babel from '@babel/standalone';

// Error Boundary Component
class ComponentErrorBoundary extends React.Component {
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

// Process icon imports - keep this simple
const processIconImports = (code) => {
  const iconImportRegex = /import\s*{\s*([^}]+)\s*}\s*from\s*['"]lucide-react['"]/g;
  let iconNames = new Set();
  
  let match;
  while ((match = iconImportRegex.exec(code)) !== null) {
    match[1].split(',').forEach(icon => {
      iconNames.add(icon.trim());
    });
  }
  
  const codeWithoutImports = code.replace(iconImportRegex, '');

  return {
    code: codeWithoutImports,
    iconNames: Array.from(iconNames)
  };
};

// Simplified MemoizedComponent
const MemoizedComponent = memo(({ component, name }) => {
  if (!component.Component) return null;

  return (
    <ComponentErrorBoundary>
      <component.Component />
    </ComponentErrorBoundary>
  );
});

// LivePreview Component
const LivePreview = ({ components = [] }) => {
  const [evaluatedComponents, setEvaluatedComponents] = useState([]);
  const evaluationCache = useRef(new Map());

  const evaluateComponent = useCallback(async (component) => {
    try {
      if (evaluationCache.current.has(component.name)) {
        return evaluationCache.current.get(component.name);
      }

      const codeToEval = component.isComplete ? component.code : component.streamedCode;
      
      console.log(`[${component.name}] Initial code:`, {
        code: codeToEval,
        classNames: codeToEval.match(/className=["']([^"']+)["']/g)
      });

      // First, handle all imports
      const { code: processedCode, iconNames } = processIconImports(codeToEval);
      
      console.log(`[${component.name}] After import processing:`, {
        code: processedCode,
        classNames: processedCode.match(/className=["']([^"']+)["']/g)
      });
      
      // Extract component name from export default if it exists
      const exportMatch = processedCode.match(/export\s+default\s+(\w+)/);
      const componentName = exportMatch ? exportMatch[1] : component.name;
      
      // Strip imports and exports but preserve the component code
      const strippedCode = processedCode
        .replace(/^import\s+.*?;?\s*$/gm, '')  // Remove imports
        .replace(/^export\s+default\s+\w+\s*;?/m, ''); // Remove export default statement

      console.log(`[${component.name}] After stripping imports/exports:`, {
        code: strippedCode,
        classNames: strippedCode.match(/className=["']([^"']+)["']/g)
      });

      // Transform JSX to plain JavaScript while preserving className strings
      const transformedCode = Babel.transform(strippedCode, {
        presets: ['react'],
        filename: component.name,
        plugins: [
          // Preserve className attributes during transformation
          function preserveClassNames() {
            return {
              visitor: {
                JSXAttribute(path) {
                  if (path.node.name.name === 'className') {
                    // Keep the className value exactly as is
                    path.skip();
                  }
                }
              }
            };
          }
        ]
      }).code;

      console.log(`[${component.name}] After Babel transform:`, {
        code: transformedCode,
        classNames: transformedCode.match(/className:\s*["']([^"']+)["']/g)
      });

      const wrappedCode = `
        'use strict';
        return (function(React, lucideIcons) {
          const { useState, useEffect, useCallback, useMemo, useRef } = React;
          const { ${Array.from(iconNames).join(', ')} } = lucideIcons;
          ${transformedCode}
          return ${componentName};
        })(arguments[0], arguments[1]);
      `;

      const ComponentClass = new Function(
        'React',
        'lucideIcons',
        wrappedCode
      )(React, lucideIcons);

      const result = {
        name: component.name,
        Component: ComponentClass,
        timestamp: Date.now()
      };

      console.log(`[${component.name}] Final component:`, result);
      return result;

    } catch (error) {
      console.error(`[${component.name}] Evaluation error:`, error);
      return {
        name: component.name,
        error: error.message
      };
    }
  }, []);

  useEffect(() => {
    Promise.all(components.map(evaluateComponent))
      .then(results => setEvaluatedComponents(results.filter(Boolean)))
      .catch(console.error);
  }, [components, evaluateComponent]);

  return (
    <div className="max-w-[2100px] mx-auto bg-slate-950 rounded-lg overflow-hidden h-full">
      <div className="w-full flex flex-col min-h-full">
        {evaluatedComponents.map((component) => (
          <MemoizedComponent
            key={component.name}
            component={component}
            name={component.name}
          />
        ))}
      </div>
    </div>
  );
};

export default memo(LivePreview);
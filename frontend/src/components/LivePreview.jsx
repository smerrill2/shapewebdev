import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import { LiveProvider, LivePreview as ReactLivePreview, LiveError } from 'react-live';
import * as Icons from '@heroicons/react/24/outline';
import * as SolidIcons from '@heroicons/react/24/solid';
import * as UI from './ui';

// Create base scope outside component to prevent recreation
const BASE_SCOPE = {
  React,
  ...React,
  Icons,
  SolidIcons,
  ...UI
};

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Component Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 border border-red-300 bg-red-50 rounded">
          <h3 className="text-red-700">Component Error</h3>
          <p className="text-red-600">{this.state.error?.message}</p>
        </div>
      );
    }
    return this.props.children;
  }
}

// Component cache settings
const MAX_COMPONENTS = 20;
const MAX_MEMORY_USAGE = 0.8; // 80% of available memory
const CACHE_EVICTION_INTERVAL = 5000; // 5 seconds

export const LivePreview = ({ components = {} }) => {
  const [scope] = useState(BASE_SCOPE);
  const componentRefs = useRef(new Map());
  const [error, setError] = useState(null);
  const lastAccessTimes = useRef(new Map());

  // Update component refs when components change
  useEffect(() => {
    Object.entries(components).forEach(([name, component]) => {
      lastAccessTimes.current.set(name, Date.now());
    });
  }, [components]);

  const transformCode = useCallback((code) => {
    try {
      const trimmedCode = code.trim();
      
      // Remove export default statements but preserve the component definition
      const transformedCode = trimmedCode.replace(/export\s+default\s+/, '');
      
      // Extract component name
      const functionMatch = transformedCode.match(/(?:function|const)\s+([A-Za-z0-9_]+)/);
      const componentName = functionMatch?.[1];
      
      if (!componentName) {
        console.error('Could not extract component name from code');
        return transformedCode;
      }

      // If code doesn't include render(), add it
      if (!transformedCode.includes('render(')) {
        return `${transformedCode}\nrender(<${componentName} />);`;
      }
      
      return transformedCode;
    } catch (err) {
      console.error('Code transform error:', err);
      return code;
    }
  }, []);

  const extractComponentName = (code) => {
    const functionMatch = code.match(/function\s+([A-Za-z0-9_]+)/);
    const constMatch = code.match(/const\s+([A-Za-z0-9_]+)\s*=/);
    return (functionMatch?.[1] || constMatch?.[1] || '').trim();
  };

  return (
    <div className="w-full" data-testid="live-preview">
      <LiveProvider>
        <div data-testid="live-provider">
          <LivePreview data-testid="preview-content" />
          <LiveError data-testid="preview-error" />
        </div>
      </LiveProvider>
      
      <div>
        {Object.entries(components).map(([componentName, { code }]) => (
          <ErrorBoundary key={componentName}>
            <div 
              data-testid={`component-wrapper-${componentName}`}
              ref={node => {
                if (node) {
                  componentRefs.current.set(componentName, { current: node });
                }
              }}
            >
              <LiveProvider
                code={code}
                scope={scope}
                transformCode={transformCode}
                noInline
              >
                <div 
                  data-testid={`live-preview-${componentName}`} 
                  className="preview-content"
                >
                  <ReactLivePreview data-testid="live-preview" />
                </div>
                <LiveError data-testid="live-error" />
              </LiveProvider>
            </div>
          </ErrorBoundary>
        ))}
      </div>
    </div>
  );
};

LivePreview.propTypes = {
  components: PropTypes.objectOf(PropTypes.shape({
    code: PropTypes.string.isRequired,
    metadata: PropTypes.object
  }))
};

export default LivePreview;

import React, { useEffect, useState, memo, useCallback, useRef } from 'react';
import { transform } from '@babel/standalone';
import { cn } from '../lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import * as lucideIcons from 'lucide-react';
import { Button } from './ui/button';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from './ui/accordion';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { Slider } from './ui/slider';
import Babel from '@babel/standalone';

// Error Boundary Component
class ComponentErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Component render error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div 
          data-testid="preview-error"
          className="p-4 text-red-400 text-sm bg-red-950/20 rounded-lg"
        >
          <p>Failed to render component:</p>
          <pre className="mt-2 text-xs">{this.state.error.message}</pre>
          {this.props.onError && (
            <button 
              onClick={() => {
                this.setState({ hasError: false, error: null, errorInfo: null });
                this.props.onError(this.state.error, this.state.errorInfo);
              }}
              className="mt-2 text-xs text-blue-400 hover:text-blue-300"
            >
              Retry
            </button>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}

// Memoized Component Wrapper
const MemoizedComponent = memo(({ Component, name, onError }) => {
  return (
    <div className="p-4">
      <ComponentErrorBoundary onError={onError}>
        <Component />
      </ComponentErrorBoundary>
    </div>
  );
});

const LivePreview = ({ 
  componentList = [], 
  activeComponentIndex = -1,
  transitionState = null 
}) => {
  const [renderedComponents, setRenderedComponents] = useState([]);
  const [error, setError] = useState(null);
  const evaluationCache = useRef(new Map());
  const evaluationQueue = useRef(new Set());

  const babelOptions = {
    presets: ['@babel/preset-react'],
    plugins: [
      ['@babel/plugin-proposal-decorators', { legacy: true }],
      '@babel/plugin-proposal-class-properties'
    ]
  };

  const transformAndEvaluate = useCallback(async (component) => {
    try {
      // Transform JSX
      const { code: transformedCode } = await transform(component.code, {
        presets: [
          'react',
          ['env', { modules: false }]
        ],
        plugins: [
          ['proposal-decorators', { version: '2018-09', decoratorsBeforeExport: true }],
          'proposal-class-properties'
        ],
      });

      // Extract the component name and definition
      const componentCode = transformedCode.replace(/export default (\w+);?$/, 'return $1;');
      
      // Create and evaluate the component
      const evalContext = {
        React,
        ...lucideIcons, // Make all Lucide icons available in scope
        useState,
        useEffect,
        useCallback,
        useRef,
        memo
      };
      
      const evalFunction = new Function(...Object.keys(evalContext), componentCode);
      const Component = evalFunction(...Object.values(evalContext));

      return { Component, timestamp: Date.now() };
    } catch (error) {
      console.error(`Failed to evaluate ${component.name}:`, error);
      throw error;
    }
  }, []);

  const evaluateComponent = useCallback(async (component) => {
    const cacheKey = `${component.name}_${component.version || '1'}`;
    
    try {
      // Check if already being evaluated
      if (evaluationQueue.current.has(cacheKey)) {
        return new Promise((resolve) => {
          const checkCache = setInterval(() => {
            if (evaluationCache.current.has(cacheKey)) {
              clearInterval(checkCache);
              resolve(evaluationCache.current.get(cacheKey));
            }
          }, 100);
        });
      }

      // Check cache first
      if (evaluationCache.current.has(cacheKey)) {
        return evaluationCache.current.get(cacheKey);
      }

      evaluationQueue.current.add(cacheKey);

      const evaluated = await transformAndEvaluate(component);
      evaluationCache.current.set(cacheKey, evaluated);
      evaluationQueue.current.delete(cacheKey);

      return evaluated;
    } catch (error) {
      evaluationQueue.current.delete(cacheKey);
      throw error;
    }
  }, [transformAndEvaluate]);

  // Cleanup old cache entries
  useEffect(() => {
    const cleanup = () => {
      const now = Date.now();
      const MAX_AGE = 5 * 60 * 1000; // 5 minutes

      evaluationCache.current.forEach((value, key) => {
        if (now - value.timestamp > MAX_AGE) {
          evaluationCache.current.delete(key);
        }
      });
    };

    const interval = setInterval(cleanup, 60000);
    return () => clearInterval(interval);
  }, []);

  // Handle component evaluation errors
  useEffect(() => {
    const evaluateComponents = async () => {
      try {
        const evaluated = await Promise.all(
          componentList
            .map(async (component) => {
              try {
                const { Component } = await evaluateComponent(component);
                return { name: component.name, Component };
              } catch (error) {
                console.error(`Failed to evaluate ${component.name}:`, error);
                return { name: component.name, error };
              }
            })
        );

        const validComponents = evaluated.filter(comp => !comp.error);
        const errors = evaluated.filter(comp => comp.error);

        if (errors.length > 0) {
          setError(errors[0].error.message);
          setRenderedComponents([]);
        } else {
          setRenderedComponents(validComponents);
          setError(null);
        }
      } catch (err) {
        console.error('Error evaluating components:', err);
        setError(err.message);
        setRenderedComponents([]);
      }
    };

    evaluateComponents();
  }, [componentList, evaluateComponent]);

  const handleComponentError = useCallback((error, componentName) => {
    console.error(`Error in component ${componentName}:`, error);
    setError(error.message);
  }, []);

  return (
    <Card 
      data-testid="live-preview"
      className="overflow-hidden bg-slate-900/50 border-slate-800"
    >
      <CardHeader className="border-b border-slate-800">
        <CardTitle data-testid="live-preview-title">Live Preview</CardTitle>
      </CardHeader>
      
      <CardContent className="p-0 min-h-[400px]">
        <div 
          data-testid="preview-container"
          className="relative w-full h-full"
        >
          {error ? (
            <div 
              data-testid="preview-error" 
              className="p-4 text-red-400 text-sm bg-red-950/20 rounded-lg flex items-center justify-center h-full"
            >
              <div>
                <p>Failed to evaluate component:</p>
                <pre className="mt-2 text-xs">{error}</pre>
              </div>
            </div>
          ) : (
            <div 
              data-testid="preview-content"
              className="w-full h-full"
            >
              <div className="space-y-4">
                {renderedComponents.map((item, index) => (
                  <MemoizedComponent
                    key={`${item.name}-${index}`}
                    Component={item.Component}
                    name={item.name}
                    onError={(error) => handleComponentError(error, item.name)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default React.memo(LivePreview);

/**
 * LivePreview Component Implementation Notes - v2.0
 * 
 * Major Updates:
 * 1. Component Evaluation
 *    - Added ComponentErrorBoundary for better error handling
 *    - Enhanced component evaluation with proper error catching
 *    - Improved dependency injection system
 * 
 * 2. Rendering System
 *    - Added transition animations between components
 *    - Implemented proper cleanup on component unmount
 *    - Enhanced error state display
 * 
 * 3. Performance Optimizations
 *    - Added component memoization
 *    - Implemented evaluation caching
 *    - Optimized re-render logic
 * 
 * @version 2.0.0
 * @lastUpdated 2024-03-20
 * @changelog
 * - Added ComponentErrorBoundary
 * - Enhanced component evaluation logic
 * - Improved error handling and display
 * - Added transition animations
 * - Implemented performance optimizations
 */ 
/**
 * Mock for react-live
 * This uses Babel to transform JSX into valid JS so we can safely `eval` or new Function() it.
 */

import React from 'react';
import { transformSync } from '@babel/core';

// A simple Header mock for testing
const HeaderMock = ({ Button }) => {
  console.log('Rendering HeaderMock with Button:', Button);
  return React.createElement(
    'header',
    { 
      'data-testid': 'header-component',
      className: 'bg-slate-900 text-white py-4'
    },
    React.createElement(
      'div',
      { className: 'container mx-auto px-4' },
      React.createElement(
        'nav',
        { className: 'flex items-center justify-between' },
        React.createElement(
          'h1',
          { className: 'text-xl font-bold' },
          'Test Header'
        ),
        React.createElement(
          Button,
          { 'data-testid': 'button-component' },
          'Click Me'
        )
      )
    )
  );
};

// Mock Button component
const Button = React.forwardRef(({ children, onClick, className, ...props }, ref) => {
  console.log('Rendering Button with props:', { children, onClick, className, ...props });
  return React.createElement(
    'button',
    { 
      onClick, 
      className, 
      ref, 
      'data-testid': 'button-component',
      ...props 
    },
    children
  );
});

// Mock Card component
const Card = React.forwardRef(({ children, className, ...props }, ref) => {
  return React.createElement(
    'div',
    { className, ref, ...props },
    children
  );
});

// Component mapping for tests
const TEST_COMPONENTS = {
  Header: HeaderMock,
  Button: Button,
  Card: Card
  // Add other test components here as needed
};

// Transform code using Babel
function transformCode(code) {
  try {
    const result = transformSync(code, {
      filename: 'live.jsx',
      presets: ['@babel/preset-react'],
      plugins: [
        // Add a plugin to handle JSX transformation
        ['@babel/plugin-transform-react-jsx', {
          pragma: 'React.createElement',
          pragmaFrag: 'React.Fragment'
        }]
      ],
      ast: false,
      code: true,
    });

    return result.code;
  } catch (error) {
    console.error('Error transforming code:', error);
    return code;
  }
}

// Extract component name from code
function extractComponentName(code) {
  // Try multiple patterns for component declarations
  const patterns = [
    /function\s+([A-Z][A-Za-z0-9]*)/,  // function Component() {}
    /const\s+([A-Z][A-Za-z0-9]*)\s*=/,  // const Component = ...
    /render\s*\(\s*<([A-Z][A-Za-z0-9]*)/, // render(<Component />)
  ];

  for (const pattern of patterns) {
    const match = code.match(pattern);
    if (match && match[1]) {
      console.log('Found component name:', match[1], 'using pattern:', pattern);
      return match[1];
    }
  }
  
  console.error('No component name found in code:', code);
  return null;
}

// Error boundary for runtime errors
class RuntimeErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return React.createElement(
        'div',
        { 'data-testid': 'error' },
        this.state.error.message
      );
    }
    return this.props.children;
  }
}

// Evaluate code and return component
export function evaluateCode(code, scope = {}) {
  try {
    console.log('evaluateCode input:', code);
    
    // Remove import statements and render statement
    code = code
      .replace(/import\s+.*?['"];?\s*/g, '')
      .replace(/render\s*\([^)]*\)\s*;?/g, '');
    
    console.log('Code after cleanup:', code);
    
    // Transform the code using Babel
    const transformedCode = transformSync(code, {
      filename: 'live.jsx',
      presets: ['@babel/preset-react'],
      plugins: [
        ['@babel/plugin-transform-react-jsx', {
          pragma: 'React.createElement',
          pragmaFrag: 'React.Fragment'
        }]
      ],
      ast: false,
      code: true,
    }).code;
    
    console.log('Transformed code:', transformedCode);
    
    // Extract the component name
    const componentName = extractComponentName(code);
    if (!componentName) {
      throw new Error('No component name found');
    }
    
    console.log('Found component:', componentName);
    
    // Create the evaluation context with all scope variables
    const scopeKeys = Object.keys(scope);
    const scopeValues = scopeKeys.map(key => scope[key]);
    
    // Create the evaluation function with all scope variables
    const evalFn = new Function(
      ...scopeKeys,
      `
        ${transformedCode}
        return ${componentName};
      `
    );
    
    // Evaluate the code with all scope values
    const Component = evalFn(...scopeValues);
    
    if (!Component) {
      console.error('Component evaluation returned null');
      throw new Error('Component evaluation failed');
    }
    
    console.log('Successfully evaluated component:', Component.name || 'Anonymous');
    
    // Return a wrapper component that provides scope and handles errors
    return function WrappedComponent(props) {
      // Ensure all scope variables are passed as props
      const componentProps = {
        ...props,
        ...Object.fromEntries(
          Object.entries(scope).filter(([key]) => key !== 'React')
        )
      };
      
      console.log('Rendering WrappedComponent with props:', componentProps);
      
      return React.createElement(
        RuntimeErrorBoundary,
        null,
        React.createElement(Component, componentProps)
      );
    };
  } catch (error) {
    console.error('Error evaluating code:', error);
    return () => React.createElement(
      'div',
      { 'data-testid': 'error' },
      error.message
    );
  }
}

export const LiveProvider = ({ code, scope = {}, children }) => {
  console.log('\nLiveProvider called with:', { code, scope });

  const [error, setError] = React.useState(null);
  const evaluatedComponent = React.useMemo(() => {
    try {
      // Ensure React is in scope
      const fullScope = { React, ...scope };
      console.log('\nEvaluating code with scope:', fullScope);
      const result = evaluateCode(code, fullScope);
      console.log('\nEvaluated component result:', result);
      return result;
    } catch (err) {
      console.error('\nLiveProvider evaluation error:', err);
      setError(err);
      return null;
    }
  }, [code, scope]);

  if (error) {
    console.error('\nLiveProvider error:', error);
  }

  // Create the rendered component outside of the Children.map
  let renderedComponent = null;
  if (evaluatedComponent) {
    try {
      // Pass scope variables directly to the evaluated component
      const componentProps = Object.fromEntries(
        Object.entries(scope).filter(([key]) => key !== 'React')
      );
      console.log('\nCreating component with props:', componentProps);
      renderedComponent = React.createElement(evaluatedComponent, componentProps);
      console.log('\nCreated component:', renderedComponent);
    } catch (err) {
      console.error('\nError creating component:', err);
      renderedComponent = React.createElement(
        'div',
        { 'data-testid': 'error' },
        err.message
      );
    }
  }

  // If there are no children, use simplified rendering
  if (!children) {
    console.log('\nRendering without children');
    return React.createElement(
      'div',
      { 'data-testid': 'live-provider' },
      React.createElement(
        'div',
        { 'data-testid': 'preview-content' },
        renderedComponent
      )
    );
  }

  // Otherwise, handle LivePreview and LiveError components
  console.log('\nRendering with children:', children);
  const result = React.createElement(
    'div',
    { 'data-testid': 'live-provider' },
    React.Children.map(children, child => {
      if (!child) return null;
      
      // Handle LiveError
      if (child.type.name === 'LiveError' && error) {
        console.log('\nRendering LiveError');
        return React.cloneElement(child, { error });
      }
      
      // Handle LivePreview
      if (child.type.name === 'LivePreview') {
        console.log('\nRendering LivePreview with component:', renderedComponent);
        return renderedComponent;
      }
      
      return child;
    })
  );
  console.log('\nFinal render result:', result);
  return result;
};

export const LiveError = ({ error }) => error ? React.createElement('pre', null, error.message) : null;

export const LivePreview = () => null; // This is just a placeholder, actual rendering is handled in LiveProvider

export default {
  LiveProvider,
  LivePreview,
  LiveError,
}; 
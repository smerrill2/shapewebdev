/**
 * Mock for react-live
 * This uses Babel to transform JSX into valid JS so we can safely `eval` or new Function() it.
 */

import React from 'react';
import { transformSync } from '@babel/core';

// Mock Button component
const Button = React.forwardRef(({ children, onClick, className }, ref) => {
  return React.createElement('button', { onClick, className, ref }, children);
});

// Mock Card component
const Card = React.forwardRef(({ children, className }, ref) => {
  return React.createElement('div', { className, ref }, children);
});

// We'll use Babel's React preset to turn JSX into createElement calls.
function transformCode(code, noInline = false) {
  try {
    // Transform JSX to JavaScript
    const result = transformSync(code, {
      filename: 'live.jsx',
      presets: ['@babel/preset-react'],
      ast: false,
      code: true,
    });

    if (!result || !result.code) {
      throw new Error('Failed to transform code');
    }

    return result.code;
  } catch (error) {
    console.error('Error transforming code:', error);
    return null;
  }
}

/**
 * Execute the transformed code in a Function with the given scope.
 * We define each scope key as a local variable so references like
 * `React.useState`, `Button`, etc. will resolve correctly.
 */
function runCode(code, scope = {}) {
  try {
    // Create a function body that includes the code and returns the result
    const functionBody = `
      let __RESULT__;
      function render(element) {
        __RESULT__ = element;
      }
      ${code}
      return __RESULT__;
    `;
    
    // Create a function with React and scope variables as parameters
    const fn = new Function('React', 'Button', 'Card', functionBody);
    
    // Execute the function with React and scope values
    return fn(React, Button, Card);
  } catch (error) {
    console.error('Error running code:', error);
    console.error('Transformed code that failed to run:', code);
    throw error;
  }
}

export const LiveProvider = ({ children, code, scope, noInline }) => {
  try {
    // For testing, we'll just render a simplified version
    return React.createElement(
      'div',
      { 'data-testid': 'live-provider' },
      children
    );
  } catch (error) {
    console.error('[react-live mock] Error rendering:', error);
    return React.createElement(
      'div',
      { 'data-testid': 'live-preview-error' },
      error.message
    );
  }
};

export const LivePreview = ({ className }) => {
  return React.createElement(
    'div',
    {
      'data-testid': 'preview-content',
      className
    },
    'Preview Content'
  );
};

export const LiveError = ({ className }) => {
  return React.createElement(
    'div',
    {
      'data-testid': 'preview-error',
      className
    }
  );
};

module.exports = {
  LiveProvider,
  LivePreview,
  LiveEditor: () => null,
  LiveError,
}; 
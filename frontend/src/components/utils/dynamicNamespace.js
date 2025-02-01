import React from 'react';
import { DEBUG_MODE } from './config';

/**
 * Creates a stub component that renders a div with debug information
 * Used when a requested component doesn't exist in the shadcn library
 */
export function createStubComponent(name) {
  if (DEBUG_MODE) {
    console.debug(`🚧 Creating stub for missing component: ${name}`);
  }

  return React.forwardRef(function StubComponent(props, ref) {
    const { children, className = '', ...rest } = props;
    
    if (DEBUG_MODE) {
      console.debug(`🎨 Rendering stub component: ${name}`, {
        props,
        hasChildren: !!children
      });
    }
    
    return (
      <div
        ref={ref}
        className={`stub-component ${className}`}
        data-component={name}
        {...rest}
      >
        {children}
      </div>
    );
  });
} 
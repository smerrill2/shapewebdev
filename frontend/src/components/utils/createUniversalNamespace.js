import React from 'react';
import * as ShadcnAll from './shadcnAll';
import { createStubComponent } from './dynamicNamespace';
import {
  DEBUG_MODE,
  CRITICAL_COMPONENTS,
  NAMESPACED_COMPONENTS,
  COMPLETE_NAMESPACED_COMPONENTS,
  REACT_INTERNAL_PROPS
} from './config';
import { CompoundComponents, createCompoundComponent } from './compoundComponents';

// Enhanced logging for component resolution
const logResolution = (name, type, details) => {
  if (DEBUG_MODE) {
    console.group(`🔍 Component Resolution: ${name}`);
    console.log(`Type: ${type}`);
    console.log('Details:', details);
    console.groupEnd();
  }
};

/**
 * Creates a universal namespace that:
 * 1. Returns real shadcn components when they exist
 * 2. Creates appropriate stubs for unknown components
 * 3. Handles both top-level and namespaced components
 * 4. Preserves compound component hierarchies
 */
export function createUniversalNamespace() {
  const componentCache = new Map();

  return function getComponent(name) {
    if (DEBUG_MODE) {
      logResolution(name, 'request', { cached: componentCache.has(name) });
    }

    if (componentCache.has(name)) {
      const cached = componentCache.get(name);
      if (DEBUG_MODE) {
        logResolution(name, 'cache-hit', { 
          type: cached.displayName || 'unknown',
          isCompound: !!cached.List || !!cached.Item
        });
      }
      return cached;
    }

    let component;
    
    // First check if it's a compound component
    if (NAMESPACED_COMPONENTS.has(name)) {
      const baseComponent = CompoundComponents[name];
      if (baseComponent) {
        // Preserve the original component hierarchy
        component = Object.assign({}, baseComponent);
        if (DEBUG_MODE) {
          logResolution(name, 'compound-existing', {
            subComponents: Object.keys(baseComponent)
          });
        }
      } else {
        // Create a new compound component with proper structure
        component = createCompoundComponent(name);
        if (DEBUG_MODE) {
          logResolution(name, 'compound-created', {
            generated: true
          });
        }
      }
    } else {
      // Try to get the real component
      component = ShadcnAll[name];
      if (component) {
        if (DEBUG_MODE) {
          logResolution(name, 'shadcn-found', {
            type: component.displayName || 'unknown'
          });
        }
      } else {
        // Create a stub as last resort
        component = createStubComponent(name);
        if (DEBUG_MODE) {
          logResolution(name, 'stub-created', {
            name,
            isStub: true
          });
        }
      }
    }

    // Wrap critical components with error boundary
    if (CRITICAL_COMPONENTS.has(name)) {
      const WrappedComponent = React.forwardRef((props, ref) => (
        <div 
          data-testid={`critical-${name.toLowerCase()}`}
          className="relative"
        >
          {React.createElement(component, { ...props, ref })}
        </div>
      ));
      WrappedComponent.displayName = `Critical(${name})`;
      // Preserve any compound component properties
      Object.assign(WrappedComponent, component);
      component = WrappedComponent;
    }

    // Add debug attributes in development
    if (component && DEBUG_MODE) {
      const DebugComponent = React.forwardRef((props, ref) => {
        logResolution(name, 'render', { props });
        return React.createElement(component, { 
          ...props,
          ref,
          'data-component-name': name,
          'data-debug': true
        });
      });
      DebugComponent.displayName = `Debug(${name})`;
      // Preserve any compound component properties
      Object.assign(DebugComponent, component);
      component = DebugComponent;
    }

    componentCache.set(name, component);
    return component;
  };
} 
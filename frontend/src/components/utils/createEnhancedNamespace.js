import React from 'react';
import { createStubComponent } from './dynamicNamespace';

/**
 * Creates an "enhanced" namespace that uses real components for 
 * known subcomponent names, and stubs for unknown ones.
 *
 * @param {string} namespace - The base namespace name ("NavigationMenu", "Typography", etc.)
 * @param {Object} config - e.g. { elementMap: {}, defaultProps: {} }
 * @param {Object} realComponents - an object of known subcomponents from the real library
 * @returns {Proxy} A proxied object that dispatches to real or stub components
 */
export function createEnhancedNamespace(namespace, config, realComponents = {}) {
  const { elementMap = {}, defaultProps = {} } = config;
  const subcomponentCache = new Map();

  // Create the base component (using Root if available, otherwise a stub)
  const BaseComponent = React.forwardRef((props, ref) => {
    // If we have a real Root component, use it
    if (realComponents.Root) {
      const RootComponent = realComponents.Root;
      return <RootComponent ref={ref} {...props} />;
    }
    
    // Otherwise create a stub with the base element
    const element = elementMap.Root || 'div';
    return React.createElement(element, { ref, ...defaultProps, ...props });
  });
  
  BaseComponent.displayName = namespace;

  return new Proxy(BaseComponent, {
    get: function(target, prop) {
      // Handle React's special symbols
      if (prop === Symbol.for('react.element') || 
          prop === '$$typeof' || 
          prop === 'render' ||
          prop === 'displayName') {
        return target[prop];
      }

      // Return cached component if it exists
      if (subcomponentCache.has(prop)) {
        return subcomponentCache.get(prop);
      }

      // Use real component if available
      if (realComponents[prop]) {
        const RealComponent = realComponents[prop];
        subcomponentCache.set(prop, RealComponent);
        return RealComponent;
      }

      // Create stub component for unknown subcomponents
      const subName = `${namespace}.${prop}`;
      const element = elementMap[prop] || 'div';
      
      const Stub = createStubComponent(subName, element, defaultProps);
      subcomponentCache.set(prop, Stub);
      return Stub;
    }
  });
} 

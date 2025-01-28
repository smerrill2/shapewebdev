import React from 'react';

/**
 * Creates a stub component that renders as a specified HTML element
 * with merged props and className handling.
 */
export function createStubComponent(displayName, element = 'div', defaultProps = {}) {
  const StubComponent = React.forwardRef(function(props, ref) {
    const { className, ...rest } = props;
    const mergedProps = {
      ...defaultProps,
      ...rest,
      className: className 
        ? `${defaultProps.className || ''} ${className}`.trim()
        : defaultProps.className,
      ref
    };

    return React.createElement(element, mergedProps);
  });

  StubComponent.displayName = displayName;
  return StubComponent;
}

/**
 * Creates a dynamic namespace for components with automatic stub generation
 */
export function createDynamicNamespace(displayName, options = {}) {
  const { elementMap = {}, defaultProps = {} } = options;
  const subcomponentCache = new Map();

  return new Proxy({}, {
    get: (target, prop) => {
      if (subcomponentCache.has(prop)) {
        return subcomponentCache.get(prop);
      }

      const subName = `${displayName}.${String(prop)}`;
      const element = elementMap[prop] || 'div';
      
      const Stub = createStubComponent(subName, element, defaultProps);
      subcomponentCache.set(prop, Stub);
      return Stub;
    }
  });
} 
import React from 'react';
import * as ShadcnAll from './shadcnAll';
import { createStubComponent } from './dynamicNamespace';

// List of components that should be namespaced (compound components)
const NAMESPACED_COMPONENTS = new Set([
  'Tabs',
  'Select',
  'DropdownMenu',
  'ContextMenu',
  'Menubar',
  'AlertDialog',
  'Dialog',
  'HoverCard',
  'Popover'
]);

// Props that should not be passed to DOM elements
const REACT_INTERNAL_PROPS = new Set([
  '$$typeof',
  'render',
  'displayName'
]);

/**
 * Creates a universal namespace that:
 * 1. Returns real shadcn components when they exist
 * 2. Creates appropriate stubs for unknown components
 * 3. Handles both top-level and namespaced components
 */
export function createUniversalNamespace() {
  const componentCache = new Map();
  const namespacedCache = new Map();

  // Create a proxy for namespaced components (like NavigationMenu.List)
  function createNamespacedProxy(namespace) {
    if (namespacedCache.has(namespace)) {
      return namespacedCache.get(namespace);
    }

    // Get the real root component if it exists
    const RealComponent = ShadcnAll[namespace];
    
    // Create the proxy that handles both the root component and its subcomponents
    const proxy = new Proxy(RealComponent || createStubComponent(namespace), {
      get: (target, prop) => {
        if (REACT_INTERNAL_PROPS.has(prop)) {
          return target[prop];
        }

        // Convert NavigationMenu.List to NavigationMenuList
        const fullName = `${namespace}${prop}`;
        const RealSubComponent = ShadcnAll[fullName];
        
        return RealSubComponent || createStubComponent(`${namespace}.${prop}`);
      }
    });

    namespacedCache.set(namespace, proxy);
    return proxy;
  }

  // Main component getter
  return function getComponent(name) {
    if (componentCache.has(name)) {
      return componentCache.get(name);
    }

    // Handle namespaced components
    if (NAMESPACED_COMPONENTS.has(name)) {
      const proxy = createNamespacedProxy(name);
      componentCache.set(name, proxy);
      return proxy;
    }

    // For non-namespaced components, return real or stub
    const component = ShadcnAll[name] || createStubComponent(name);
    componentCache.set(name, component);
    return component;
  };
} 
import React from 'react';
import * as ShadcnAll from './shadcnAll';
import { createStubComponent } from './dynamicNamespace';
import { DEBUG_MODE, NAMESPACED_COMPONENTS } from './config';
import { CompoundComponents, createCompoundComponent } from './compoundComponents';

/**
 * Creates a universal namespace that:
 * 1. Returns real shadcn components when they exist
 * 2. Creates appropriate stubs for unknown components
 * 3. Handles both top-level and namespaced components
 */
export function createUniversalNamespace() {
  const componentCache = new Map();

  return function getComponent(name) {
    if (DEBUG_MODE) {
      console.debug(`🔍 Resolving component: ${name}`);
    }

    if (componentCache.has(name)) {
      return componentCache.get(name);
    }

    let component;
    
    // First check if it's a compound component
    if (NAMESPACED_COMPONENTS.has(name)) {
      component = CompoundComponents[name] || createCompoundComponent(name);
    } else {
      // Otherwise, return the component from ShadcnAll or a stub
      component = ShadcnAll[name] || createStubComponent(name);
    }

    if (DEBUG_MODE) {
      console.debug(`✅ Component resolved: ${name}`, {
        isCompound: NAMESPACED_COMPONENTS.has(name),
        isStub: !component
      });
    }

    componentCache.set(name, component);
    return component;
  };
} 
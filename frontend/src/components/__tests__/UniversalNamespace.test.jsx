import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { createUniversalNamespace } from '../utils/createUniversalNamespace';
import * as ShadcnAll from '../utils/shadcnAll';

// Mock shadcn components
jest.mock('../utils/shadcnAll', () => {
  const Button = ({ children, ...props }) => <button data-shadcn-button {...props}>{children}</button>;
  Button.displayName = 'Button';

  const NavigationMenuRoot = ({ children, ...props }) => <nav data-shadcn-nav-root {...props}>{children}</nav>;
  NavigationMenuRoot.displayName = 'NavigationMenuRoot';

  const NavigationMenuList = ({ children, ...props }) => <ul data-shadcn-nav-list {...props}>{children}</ul>;
  NavigationMenuList.displayName = 'NavigationMenuList';

  const NavigationMenuLink = ({ children, ...props }) => <a data-shadcn-nav-link {...props}>{children}</a>;
  NavigationMenuLink.displayName = 'NavigationMenuLink';

  return {
    Button,
    NavigationMenuRoot,
    NavigationMenuList,
    NavigationMenuLink
  };
});

describe('Universal Namespace System', () => {
  let getComponent;

  beforeEach(() => {
    getComponent = createUniversalNamespace();
  });

  // Test top-level components
  describe('Top-level Components', () => {
    it('returns real shadcn components when they exist', () => {
      const Button = getComponent('Button');
      
      render(
        <Button data-testid="button">Click me</Button>
      );

      const button = screen.getByTestId('button');
      expect(button).toHaveAttribute('data-shadcn-button');
    });

    it('creates stubs for unknown top-level components', () => {
      const UnknownComponent = getComponent('UnknownComponent');
      
      render(
        <UnknownComponent data-testid="unknown">Unknown</UnknownComponent>
      );

      const unknown = screen.getByTestId('unknown');
      expect(unknown.tagName).toBe('DIV');
    });
  });

  // Test namespaced components
  describe('Namespaced Components', () => {
    it('handles known namespaced components correctly', () => {
      const NavigationMenu = getComponent('NavigationMenu');
      
      render(
        <div>
          <NavigationMenu data-testid="root">
            <NavigationMenu.List data-testid="list">
              <NavigationMenu.Link href="#" data-testid="link">
                Link
              </NavigationMenu.Link>
            </NavigationMenu.List>
          </NavigationMenu>
        </div>
      );

      // Root should use NavigationMenuRoot
      const root = screen.getByTestId('root');
      expect(root).toHaveAttribute('data-shadcn-nav-root');

      // List should use NavigationMenuList
      const list = screen.getByTestId('list');
      expect(list).toHaveAttribute('data-shadcn-nav-list');

      // Link should use NavigationMenuLink
      const link = screen.getByTestId('link');
      expect(link).toHaveAttribute('data-shadcn-nav-link');
    });

    it('creates stubs for unknown subcomponents', () => {
      const NavigationMenu = getComponent('NavigationMenu');
      
      render(
        <NavigationMenu.Unknown data-testid="unknown">
          Unknown Subcomponent
        </NavigationMenu.Unknown>
      );

      const unknown = screen.getByTestId('unknown');
      expect(unknown.tagName).toBe('DIV');
    });
  });

  // Test caching
  describe('Component Caching', () => {
    it('caches and reuses components', () => {
      const Button1 = getComponent('Button');
      const Button2 = getComponent('Button');
      expect(Button1).toBe(Button2);

      const NavigationMenu1 = getComponent('NavigationMenu');
      const NavigationMenu2 = getComponent('NavigationMenu');
      expect(NavigationMenu1).toBe(NavigationMenu2);

      const Link1 = NavigationMenu1.Link;
      const Link2 = NavigationMenu1.Link;
      expect(Link1).toBe(Link2);
    });
  });

  // Test React internals handling
  describe('React Internals', () => {
    it('preserves React internal properties', () => {
      const Button = getComponent('Button');
      expect(Button.displayName).toBe('Button');
      expect(typeof Button).toBe('function');
    });
  });
}); 
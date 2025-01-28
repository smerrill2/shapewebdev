jest.mock('react-live', () => ({
  LiveProvider: ({ children }) => children,
  LivePreview: ({ children }) => children,
  LiveEditor: () => null,
  LiveError: () => null,
}));

jest.mock('@radix-ui/react-navigation-menu', () => {
  const createMockComponent = (testId) => {
    const Component = ({ children }) => <div data-testid={testId}>{children}</div>;
    Component.displayName = `Mock${testId}`;
    return Component;
  };

  const Root = createMockComponent('nav-menu');
  const List = createMockComponent('nav-menu-list');
  const Item = createMockComponent('nav-menu-item');
  const Trigger = createMockComponent('nav-menu-trigger');
  const Content = createMockComponent('nav-menu-content');
  const Link = createMockComponent('nav-menu-link');
  const Viewport = createMockComponent('nav-menu-viewport');

  return {
    Root,
    List,
    Item,
    Trigger,
    Content,
    Link,
    Viewport,
    displayName: 'MockNavigationMenu'
  };
});

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import SimpleLivePreview from '../SimpleLivePreview';
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuTrigger,
  NavigationMenuContent,
  NavigationMenuLink
} from '../ui/navigation-menu';

describe('DynamicNamespaceIntegration', () => {
  it('renders complex component structures', () => {
    const code = `
      <NavigationMenu>
        <NavigationMenu.List>
          <NavigationMenu.Item>
            <NavigationMenu.Trigger>Item 1</NavigationMenu.Trigger>
            <NavigationMenu.Content>Content 1</NavigationMenu.Content>
          </NavigationMenu.Item>
        </NavigationMenu.List>
      </NavigationMenu>
    `;

    render(<SimpleLivePreview code={code} />);
    
    expect(screen.getByTestId('nav-menu')).toBeInTheDocument();
    expect(screen.getByTestId('nav-menu-list')).toBeInTheDocument();
    expect(screen.getByTestId('nav-menu-item')).toBeInTheDocument();
    expect(screen.getByTestId('nav-menu-trigger')).toBeInTheDocument();
    expect(screen.getByTestId('nav-menu-content')).toBeInTheDocument();
  });

  it('handles error cases gracefully', () => {
    const invalidCode = 'invalid javascript code';
    render(<SimpleLivePreview code={invalidCode} />);
    expect(screen.getByTestId('preview-error')).toBeInTheDocument();
  });

  it('handles streaming behavior', () => {
    const initialCode = '<div>Initial</div>';
    const { rerender } = render(<SimpleLivePreview code={initialCode} />);
    expect(screen.getByText('Initial')).toBeInTheDocument();

    const updatedCode = '<div>Updated</div>';
    rerender(<SimpleLivePreview code={updatedCode} />);
    expect(screen.getByText('Updated')).toBeInTheDocument();
  });
}); 
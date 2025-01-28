import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { createEnhancedNamespace } from '../utils/createEnhancedNamespace';
import * as NavigationMenuPrimitive from '@radix-ui/react-navigation-menu';

// Mock NavigationMenuPrimitive components
jest.mock('@radix-ui/react-navigation-menu', () => ({
  Root: ({ children, ...props }) => <div data-radix-root {...props}>{children}</div>,
  Link: ({ children, ...props }) => <a data-radix-link {...props}>{children}</a>,
}));

describe('createEnhancedNamespace', () => {
  it('uses the real component for known subcomponents, stubs for unknown', () => {
    // Create a dynamic namespace with real components
    const NavigationMenu = createEnhancedNamespace(
      'NavigationMenu',
      {
        elementMap: {
          Foo: 'section', // fallback for "Foo" subcomponent
        },
        defaultProps: {
          role: 'navigation'
        }
      },
      {
        Root: NavigationMenuPrimitive.Root,
        Link: NavigationMenuPrimitive.Link,
      }
    );

    function TestComponent() {
      return (
        <NavigationMenu.Root data-testid="root">
          {/* Known subcomponent => real Radix component */}
          <NavigationMenu.Link href="#" data-testid="link">
            Real Link
          </NavigationMenu.Link>
          {/* Unknown subcomponent => fallback stub */}
          <NavigationMenu.Foo data-testid="foo">
            Stub fallback
          </NavigationMenu.Foo>
        </NavigationMenu.Root>
      );
    }

    render(<TestComponent />);

    // The real "Link" should be from Radix UI
    const link = screen.getByTestId('link');
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('data-radix-link');

    // The root should be the real Radix component
    const root = screen.getByTestId('root');
    expect(root).toHaveAttribute('data-radix-root');

    // The "Foo" component should be a stub section
    const foo = screen.getByTestId('foo');
    expect(foo).toBeInTheDocument();
    expect(foo.tagName).toBe('SECTION');
  });

  it('handles deeply nested unknown components', () => {
    const Typography = createEnhancedNamespace(
      'Typography',
      {
        elementMap: {
          CustomHeading: 'h2',
          CustomSpan: 'span'
        }
      }
    );

    function TestComponent() {
      return (
        <Typography.CustomHeading data-testid="heading">
          <Typography.CustomSpan data-testid="span">
            Deeply nested custom elements
          </Typography.CustomSpan>
        </Typography.CustomHeading>
      );
    }

    render(<TestComponent />);

    const heading = screen.getByTestId('heading');
    expect(heading.tagName).toBe('H2');

    const span = screen.getByTestId('span');
    expect(span.tagName).toBe('SPAN');
  });

  it('preserves defaultProps and className handling', () => {
    const Button = createEnhancedNamespace(
      'Button',
      {
        elementMap: {
          Custom: 'button'
        },
        defaultProps: {
          type: 'button',
          className: 'base-class'
        }
      }
    );

    render(
      <Button.Custom 
        data-testid="button"
        className="extra-class"
        variant="primary"
      >
        Test Button
      </Button.Custom>
    );

    const button = screen.getByTestId('button');
    expect(button).toHaveAttribute('type', 'button');
    expect(button).toHaveClass('base-class', 'extra-class');
  });
}); 
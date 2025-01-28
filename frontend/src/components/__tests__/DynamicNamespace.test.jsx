import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';

// Import the function we'll create
import { createDynamicNamespace } from '../utils/dynamicNamespace';

describe('Dynamic Namespace System', () => {
  // Basic Component Creation
  describe('Basic Component Creation', () => {
    it('creates basic stub components', () => {
      const Typography = createDynamicNamespace('Typography');
      
      function TestComponent() {
        return (
          <div>
            <Typography data-testid="root">Root</Typography>
            <Typography.H1 data-testid="h1">Heading 1</Typography.H1>
            <Typography.H2 data-testid="h2">Heading 2</Typography.H2>
            <Typography.Unknown data-testid="unknown">Unknown</Typography.Unknown>
          </div>
        );
      }

      render(<TestComponent />);

      // Verify all components render
      expect(screen.getByTestId('root')).toBeInTheDocument();
      expect(screen.getByTestId('h1')).toBeInTheDocument();
      expect(screen.getByTestId('h2')).toBeInTheDocument();
      expect(screen.getByTestId('unknown')).toBeInTheDocument();
    });

    it('creates deeply nested subcomponents', () => {
      const Menu = createDynamicNamespace('Menu');
      
      function TestComponent() {
        return (
          <Menu.Dropdown.List.Item.Icon data-testid="deep-nested">
            Deeply Nested
          </Menu.Dropdown.List.Item.Icon>
        );
      }

      render(<TestComponent />);
      expect(screen.getByTestId('deep-nested')).toBeInTheDocument();
    });
  });

  // Element Mapping
  describe('Element Mapping', () => {
    it('handles element mapping based on subcomponent name', () => {
      const Typography = createDynamicNamespace('Typography', {
        elementMap: {
          H1: 'h1',
          H2: 'h2',
          P: 'p',
          Strong: 'strong',
          Em: 'em'
        }
      });

      function TestComponent() {
        return (
          <div>
            <Typography.H1 data-testid="h1">Heading 1</Typography.H1>
            <Typography.P data-testid="p">Paragraph</Typography.P>
            <Typography.Strong data-testid="strong">Bold</Typography.Strong>
            <Typography.Em data-testid="em">Emphasis</Typography.Em>
          </div>
        );
      }

      render(<TestComponent />);
      
      expect(screen.getByTestId('h1').tagName.toLowerCase()).toBe('h1');
      expect(screen.getByTestId('p').tagName.toLowerCase()).toBe('p');
      expect(screen.getByTestId('strong').tagName.toLowerCase()).toBe('strong');
      expect(screen.getByTestId('em').tagName.toLowerCase()).toBe('em');
    });

    it('falls back to div when no element mapping exists', () => {
      const Custom = createDynamicNamespace('Custom', {
        elementMap: { Specific: 'span' }
      });

      function TestComponent() {
        return (
          <Custom.Unknown data-testid="unknown">Unknown Element</Custom.Unknown>
        );
      }

      render(<TestComponent />);
      expect(screen.getByTestId('unknown').tagName.toLowerCase()).toBe('div');
    });
  });

  // Props Handling
  describe('Props Handling', () => {
    it('preserves variant and size props with proper classes', () => {
      const Button = createDynamicNamespace('Button');

      function TestComponent() {
        return (
          <div>
            <Button.Primary 
              data-testid="primary"
              variant="outline"
              size="sm"
            >
              Primary
            </Button.Primary>
            <Button.Secondary
              data-testid="secondary"
              variant="ghost"
              size="lg"
            >
              Secondary
            </Button.Secondary>
          </div>
        );
      }

      render(<TestComponent />);
      
      const primary = screen.getByTestId('primary');
      const secondary = screen.getByTestId('secondary');

      // Check size classes
      expect(primary).toHaveClass('h-9 px-3 text-sm');
      expect(secondary).toHaveClass('h-11 px-8');

      // Check variant classes
      expect(primary).toHaveClass('border border-input bg-transparent');
      expect(secondary).toHaveClass('hover:bg-accent hover:text-accent-foreground');
    });

    it('merges custom className with variant/size classes', () => {
      const Button = createDynamicNamespace('Button');

      function TestComponent() {
        return (
          <Button.Primary 
            data-testid="button"
            variant="outline"
            size="sm"
            className="custom-class"
          >
            Click me
          </Button.Primary>
        );
      }

      render(<TestComponent />);
      const button = screen.getByTestId('button');
      expect(button).toHaveClass('custom-class');
      expect(button).toHaveClass('h-9 px-3 text-sm');
      expect(button).toHaveClass('border border-input bg-transparent');
    });

    it('handles ref forwarding correctly', () => {
      const Button = createDynamicNamespace('Button');
      const ref = React.createRef();

      function TestComponent() {
        return (
          <Button.Primary ref={ref} data-testid="button">
            Click me
          </Button.Primary>
        );
      }

      render(<TestComponent />);
      const button = screen.getByTestId('button');
      expect(ref.current).toBe(button);
    });
  });

  // Component Caching
  describe('Component Caching', () => {
    it('caches and reuses generated components', () => {
      const Menu = createDynamicNamespace('Menu');
      
      // Create two instances of the same subcomponent
      const ItemOne = Menu.Item;
      const ItemTwo = Menu.Item;

      // They should be the exact same component (not just equal)
      expect(ItemOne).toBe(ItemTwo);
    });

    it('maintains separate caches for different namespaces', () => {
      const MenuOne = createDynamicNamespace('MenuOne');
      const MenuTwo = createDynamicNamespace('MenuTwo');

      const ItemOne = MenuOne.Item;
      const ItemTwo = MenuTwo.Item;

      expect(ItemOne).not.toBe(ItemTwo);
      expect(ItemOne.displayName).toBe('MenuOne.Item');
      expect(ItemTwo.displayName).toBe('MenuTwo.Item');
    });
  });

  // Default Props
  describe('Default Props', () => {
    it('applies namespace-level default props', () => {
      const Nav = createDynamicNamespace('Nav', {
        defaultProps: {
          role: 'navigation',
          'aria-label': 'Main navigation'
        }
      });

      function TestComponent() {
        return (
          <div>
            <Nav data-testid="root" />
            <Nav.Item data-testid="item" />
          </div>
        );
      }

      render(<TestComponent />);
      
      expect(screen.getByTestId('root')).toHaveAttribute('role', 'navigation');
      expect(screen.getByTestId('root')).toHaveAttribute('aria-label', 'Main navigation');
      expect(screen.getByTestId('item')).toHaveAttribute('role', 'navigation');
      expect(screen.getByTestId('item')).toHaveAttribute('aria-label', 'Main navigation');
    });

    it('allows overriding default props', () => {
      const Nav = createDynamicNamespace('Nav', {
        defaultProps: {
          role: 'navigation',
          'aria-label': 'Main navigation'
        }
      });

      function TestComponent() {
        return (
          <Nav.Item 
            data-testid="item"
            role="menuitem"
            aria-label="Custom label"
          />
        );
      }

      render(<TestComponent />);
      
      const item = screen.getByTestId('item');
      expect(item).toHaveAttribute('role', 'menuitem');
      expect(item).toHaveAttribute('aria-label', 'Custom label');
    });
  });

  // Event Handling
  describe('Event Handling', () => {
    it('handles events correctly', async () => {
      const user = userEvent.setup();
      const handleClick = jest.fn();
      const Button = createDynamicNamespace('Button');

      function TestComponent() {
        return (
          <Button.Primary 
            data-testid="button"
            onClick={handleClick}
          >
            Click me
          </Button.Primary>
        );
      }

      render(<TestComponent />);
      
      const button = screen.getByTestId('button');
      await user.click(button);
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });
}); 
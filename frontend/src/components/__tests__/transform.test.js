import { cleanCodeForLive } from '../utils/babelTransformations';

describe('Code Transformation Pipeline', () => {
  // Helper function to normalize whitespace for comparison
  const normalizeWhitespace = (str) => str.replace(/\s+/g, ' ').trim();

  // Test 1: Basic component transformation
  it('should transform a basic component correctly', () => {
    const input = `
      function TestComponent() {
        return (
          <div>Hello World</div>
        );
      }
    `;
    
    const result = cleanCodeForLive(input);
    const normalized = normalizeWhitespace(result);
    
    // Should contain the component definition
    expect(normalized).toContain('function TestComponent()');
    // Should have the render call
    expect(normalized).toContain('render(React.createElement(TestComponent))');
    // Should not have any imports or exports
    expect(normalized).not.toMatch(/import .* from/);
    expect(normalized).not.toMatch(/export /);
  });

  // Test 2: Component with props
  it('should handle components with props correctly', () => {
    const input = `
      function PriceTag({ price, currency = "$" }) {
        return (
          <div className="price-tag">
            {currency}{price.toFixed(2)}
          </div>
        );
      }
    `;
    
    const result = cleanCodeForLive(input);
    const normalized = normalizeWhitespace(result);
    
    // Should preserve the props
    expect(normalized).toContain('function PriceTag({ price, currency = "$" })');
    // Should handle JSX attributes
    expect(normalized).toContain('className: "price-tag"');
    // Should have the render call
    expect(normalized).toContain('render(React.createElement(PriceTag))');
  });

  // Test 3: Component with hooks and event handlers
  it('should preserve React hooks and event handlers', () => {
    const input = `
      function Counter() {
        const [count, setCount] = React.useState(0);
        
        const handleClick = () => setCount(c => c + 1);
        
        return (
          <button onClick={handleClick}>
            Count: {count}
          </button>
        );
      }
    `;
    
    const result = cleanCodeForLive(input);
    const normalized = normalizeWhitespace(result);
    
    // Should preserve the useState hook
    expect(normalized).toContain('React.useState(0)');
    // Should preserve the event handler
    expect(normalized).toContain('onClick: handleClick');
    // Should have the render call
    expect(normalized).toContain('render(React.createElement(Counter))');
  });

  // Test 4: Component with className utility
  it('should handle className utility correctly', () => {
    const input = `
      function Button({ variant }) {
        return (
          <button
            className={cn(
              "base-class",
              variant === "primary" && "primary-class",
              variant === "secondary" && "secondary-class"
            )}
          >
            Click me
          </button>
        );
      }
    `;
    
    const result = cleanCodeForLive(input);
    const normalized = normalizeWhitespace(result);
    
    // Should preserve the cn utility call
    expect(normalized).toContain('className: cn("base-class"');
    // Should preserve the conditional classes
    expect(normalized).toContain('variant === "primary"');
    // Should have the render call
    expect(normalized).toContain('render(React.createElement(Button))');
  });

  // Test 5: Full component example
  it('should transform a complete component correctly', () => {
    const input = `
      import React from 'react';
      import { cn } from '../lib/utils';
      
      function PriceTag({ price = 0, discount = 0, currency = "$" }) {
        const finalPrice = discount ? price * (1 - discount) : price;
        
        return (
          <div className={cn("flex items-center gap-2", {
            "text-red-500": discount > 0
          })}>
            <span className="text-2xl font-bold">
              {currency}{finalPrice.toFixed(2)}
            </span>
            {discount > 0 && (
              <span className="text-sm line-through">
                {currency}{price.toFixed(2)}
              </span>
            )}
          </div>
        );
      }
      
      export default PriceTag;
      render(<PriceTag price={100} discount={0.2} />);
    `;
    
    const result = cleanCodeForLive(input);
    const normalized = normalizeWhitespace(result);
    
    // Should remove imports
    expect(normalized).not.toMatch(/import .* from/);
    // Should remove exports
    expect(normalized).not.toMatch(/export /);
    // Should preserve the component definition
    expect(normalized).toContain('function PriceTag({');
    // Should preserve the cn utility
    expect(normalized).toContain('className: cn("flex items-center gap-2"');
    // Should have exactly one render call
    expect(normalized.match(/render\(/g).length).toBe(1);
    // Should use React.createElement in the render call
    expect(normalized).toContain('render(React.createElement(PriceTag))');
  });
}); 
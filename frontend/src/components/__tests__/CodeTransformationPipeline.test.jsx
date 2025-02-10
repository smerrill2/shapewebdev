import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { cleanCode, extractFunctionDefinitions, validateJSXSyntax } from '../utils/babelTransformations';
import { evaluateCode } from './__mocks__/react-live';
import { LiveProvider, LivePreview } from 'react-live';
import { describe, it, expect } from 'vitest';
import { cleanCodeForLive } from '../utils/babelTransformations';
import * as Babel from '@babel/standalone';

describe('Code transformation and evaluation', () => {
  const TEST_HEADER_COMPONENT = `
    function Header() {
      return (
        <header data-testid="header-component" className="bg-slate-900 text-white py-4">
          <div className="container mx-auto px-4">
            <nav className="flex items-center justify-between">
              <h1 className="text-xl font-bold">Test Header</h1>
              <Button>Click Me</Button>
            </nav>
          </div>
        </header>
      );
    }
  `.trim();

  beforeEach(() => {
    cleanup();
    // Clear console mocks between tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Code Cleaning', () => {
    test('cleanCode produces valid output', () => {
      const cleaned = cleanCode(TEST_HEADER_COMPONENT);
      
      // Log the cleaned code for debugging
      console.log('Cleaned code:', cleaned);
      
      // Basic structure checks
      expect(cleaned).toContain('function Header()');
      expect(cleaned).toContain('<Button>Click Me</Button>');
      expect(cleaned).toContain('render(<Header');
      
      // Verify JSX syntax
      expect(() => validateJSXSyntax(cleaned)).not.toThrow();
      
      // Check function extraction
      const functions = extractFunctionDefinitions(cleaned);
      expect(functions.size).toBe(1);
      expect(functions.has('Header')).toBe(true);
      
      const headerFunc = functions.get('Header');
      expect(headerFunc.complete).toBe(true);
      expect(headerFunc.isStreaming).toBe(false);
      
      // Verify the content has all necessary closing tags
      expect(cleaned).toContain('</header>');
      expect(cleaned).toContain('</div>');
      expect(cleaned).toContain('</nav>');
      expect(cleaned).toContain('</h1>');
    });
  });

  describe('Code Evaluation', () => {
    test('evaluateCode returns a valid Header component', () => {
      const cleaned = cleanCode(TEST_HEADER_COMPONENT);
      
      // Create a mock Button component for the scope
      const mockButton = jest.fn(({ children }) => (
        <button data-testid="mock-button">{children}</button>
      ));
      
      const scope = { React, Button: mockButton };
      
      // Evaluate the code
      const HeaderComponent = evaluateCode(cleaned, scope);
      
      // Log evaluation results for debugging
      console.log('Evaluated component:', HeaderComponent);
      
      // Verify we got a function back
      expect(typeof HeaderComponent).toBe('function');
      
      // Render the component
      render(<HeaderComponent Button={mockButton} />);
      
      // Verify the rendered output
      const header = screen.getByTestId('header-component');
      expect(header).toBeInTheDocument();
      expect(header).toHaveClass('bg-slate-900', 'text-white', 'py-4');
      
      const heading = screen.getByText('Test Header');
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveClass('text-xl', 'font-bold');
      
      const button = screen.getByTestId('mock-button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('Click Me');
      
      // Verify Button was rendered with correct props
      expect(mockButton).toHaveBeenCalled();
    });

    test('evaluateCode handles render statement correctly', () => {
      const codeWithRender = `
        function Header() {
          return (
            <header data-testid="header-component">
              <h1>Test Header</h1>
              <Button>Click Me</Button>
            </header>
          );
        }
        render(<Header />);
      `.trim();

      const cleaned = cleanCode(codeWithRender);
      const mockButton = jest.fn(({ children }) => (
        <button data-testid="mock-button">{children}</button>
      ));
      
      const scope = { React, Button: mockButton };
      const Component = evaluateCode(cleaned, scope);
      
      render(<Component Button={mockButton} />);
      
      expect(screen.getByTestId('header-component')).toBeInTheDocument();
      expect(screen.getByText('Test Header')).toBeInTheDocument();
      expect(screen.getByTestId('mock-button')).toBeInTheDocument();
    });

    test('evaluateCode handles errors gracefully', () => {
      const invalidCode = `
        function Header() {
          return (
            <header
              This is invalid JSX
            </header>
          );
        }
      `.trim();

      const cleaned = cleanCode(invalidCode);
      const mockButton = jest.fn(({ children }) => (
        <button>{children}</button>
      ));
      
      const scope = { React, Button: mockButton };
      
      // Should not throw, but return a fallback component
      expect(() => evaluateCode(cleaned, scope)).not.toThrow();
      
      const Component = evaluateCode(cleaned, scope);
      expect(typeof Component).toBe('function');
      
      // Rendering should not throw
      expect(() => render(<Component Button={mockButton} />)).not.toThrow();
    });
  });

  describe('Complex Component Scenarios', () => {
    test('evaluateCode handles components with hooks', () => {
      const codeWithHooks = `
        function Counter() {
          const [count, setCount] = React.useState(0);
          
          React.useEffect(() => {
            document.title = \`Count: \${count}\`;
          }, [count]);

          return (
            <div data-testid="counter-component">
              <p>Count: {count}</p>
              <Button onClick={() => setCount(c => c + 1)}>
                Increment
              </Button>
            </div>
          );
        }
      `.trim();

      const cleaned = cleanCode(codeWithHooks);
      const mockButton = jest.fn(({ children, onClick }) => (
        <button data-testid="mock-button" onClick={onClick}>{children}</button>
      ));
      
      const scope = { 
        React, 
        Button: mockButton,
        useState: React.useState,
        useEffect: React.useEffect
      };
      
      const Component = evaluateCode(cleaned, scope);
      render(<Component Button={mockButton} />);
      
      expect(screen.getByTestId('counter-component')).toBeInTheDocument();
      expect(screen.getByText('Count: 0')).toBeInTheDocument();
      expect(screen.getByTestId('mock-button')).toBeInTheDocument();
    });

    test('evaluateCode handles nested component definitions', () => {
      const codeWithNested = `
        function ParentComponent() {
          function ChildComponent({ label }) {
            return (
              <div data-testid="child-component">
                <p>{label}</p>
                <Button>Child Button</Button>
              </div>
            );
          }

          return (
            <div data-testid="parent-component">
              <h1>Parent</h1>
              <ChildComponent label="Test Label" />
              <Button>Parent Button</Button>
            </div>
          );
        }
      `.trim();

      const cleaned = cleanCode(codeWithNested);
      const mockButton = jest.fn(({ children }) => (
        <button data-testid="mock-button">{children}</button>
      ));
      
      const scope = { React, Button: mockButton };
      const Component = evaluateCode(cleaned, scope);
      
      render(<Component Button={mockButton} />);
      
      expect(screen.getByTestId('parent-component')).toBeInTheDocument();
      expect(screen.getByTestId('child-component')).toBeInTheDocument();
      expect(screen.getByText('Test Label')).toBeInTheDocument();
      expect(screen.getAllByTestId('mock-button')).toHaveLength(2);
    });

    test('evaluateCode handles async component logic', () => {
      const codeWithAsync = `
        function AsyncComponent() {
          const [data, setData] = React.useState(null);
          const [loading, setLoading] = React.useState(true);

          React.useEffect(() => {
            async function fetchData() {
              try {
                setLoading(true);
                // Simulate API call
                await new Promise(resolve => setTimeout(resolve, 100));
                setData('Test Data');
              } finally {
                setLoading(false);
              }
            }
            fetchData();
          }, []);

          if (loading) {
            return <div data-testid="loading">Loading...</div>;
          }

          return (
            <div data-testid="async-component">
              <p>{data}</p>
              <Button>Refresh</Button>
            </div>
          );
        }
      `.trim();

      const cleaned = cleanCode(codeWithAsync);
      const mockButton = jest.fn(({ children }) => (
        <button data-testid="mock-button">{children}</button>
      ));
      
      const scope = { 
        React, 
        Button: mockButton,
        useState: React.useState,
        useEffect: React.useEffect
      };
      
      const Component = evaluateCode(cleaned, scope);
      render(<Component Button={mockButton} />);
      
      // Initially should show loading
      expect(screen.getByTestId('loading')).toBeInTheDocument();
    });
  });

  describe('Error Message Clarity', () => {
    test('provides clear error messages for syntax errors', () => {
      const codeWithSyntaxError = `
        function BrokenComponent() {
          return (
            <div>
              <Button>Unclosed Button
            </div>
          );
        }
      `.trim();

      const cleaned = cleanCode(codeWithSyntaxError);
      const Component = evaluateCode(cleaned, { React });
      
      render(<Component />);
      
      const errorElement = screen.getByTestId('error');
      expect(errorElement).toBeInTheDocument();
      expect(errorElement.textContent).toMatch(/Unterminated JSX contents/i);
    });

    test('provides clear error messages for runtime errors', () => {
      const codeWithRuntimeError = `
        function ErrorComponent() {
          // Cause a runtime error by accessing undefined property
          const value = null.something;
          return <div>Should not render</div>;
        }
      `.trim();

      const cleaned = cleanCode(codeWithRuntimeError);
      const Component = evaluateCode(cleaned, { React });
      
      // Suppress console.error for this test
      const originalError = console.error;
      console.error = jest.fn();
      
      try {
        render(<Component />);
        const errorElement = screen.getByTestId('error');
        expect(errorElement).toBeInTheDocument();
        expect(errorElement.textContent).toBe('Cannot read properties of null (reading \'something\')');
      } finally {
        // Restore console.error
        console.error = originalError;
      }
    });
  });

  describe('Performance Optimization', () => {
    test('evaluateCode handles repeated calls efficiently', () => {
      const code = `
        function SimpleComponent() {
          return <div data-testid="simple">Hello</div>;
        }
      `.trim();

      // First call
      const start1 = performance.now();
      const Component1 = evaluateCode(code, { React });
      const time1 = performance.now() - start1;

      // Second call
      const start2 = performance.now();
      const Component2 = evaluateCode(code, { React });
      const time2 = performance.now() - start2;

      // Second call should be similar or faster
      expect(time2).toBeLessThanOrEqual(time1 * 1.5); // Allow some margin

      // Verify both components render the same content
      render(<Component1 />);
      const element1 = screen.getByTestId('simple');
      expect(element1).toHaveTextContent('Hello');
      cleanup();

      render(<Component2 />);
      const element2 = screen.getByTestId('simple');
      expect(element2).toHaveTextContent('Hello');
    });

    test('evaluateCode handles large component trees efficiently', () => {
      const start = performance.now();
      
      const largeCode = `
        function LargeComponent() {
          return (
            <div>
              {Array.from({ length: 100 }).map((_, i) => (
                <div key={i}>
                  <h2>Section {i}</h2>
                  <p>Content {i}</p>
                  <Button>Button {i}</Button>
                </div>
              ))}
            </div>
          );
        }
      `.trim();

      const Component = evaluateCode(largeCode, { React });
      const transformTime = performance.now() - start;
      
      // Transformation should be reasonably fast (adjust threshold as needed)
      expect(transformTime).toBeLessThan(1000);
      
      // Component should render without issues
      render(<Component />);
      const buttons = screen.getAllByText(/Button \d+/);
      expect(buttons).toHaveLength(100);
    });
  });

  describe('LiveProvider Integration', () => {
    test('LiveProvider correctly renders evaluated component', () => {
      const code = `
        function TestComponent() {
          return (
            <div data-testid="test-component">
              <h1>Test</h1>
              <Button>Click Me</Button>
            </div>
          );
        }
      `.trim();

      const mockButton = jest.fn(({ children }) => (
        <button data-testid="mock-button">{children}</button>
      ));

      render(
        <LiveProvider 
          code={code} 
          scope={{ React, Button: mockButton }}
          noInline
        >
          <LivePreview />
        </LiveProvider>
      );

      expect(screen.getByTestId('test-component')).toBeInTheDocument();
      expect(screen.getByTestId('mock-button')).toBeInTheDocument();
    });

    test('LiveProvider handles component updates', () => {
      const initialCode = `
        function TestComponent() {
          return <div data-testid="test">Initial</div>;
        }
      `.trim();

      const updatedCode = `
        function TestComponent() {
          return <div data-testid="test">Updated</div>;
        }
      `.trim();

      const { rerender } = render(
        <LiveProvider code={initialCode} scope={{ React }} noInline>
          <LivePreview />
        </LiveProvider>
      );

      expect(screen.getByText('Initial')).toBeInTheDocument();

      rerender(
        <LiveProvider code={updatedCode} scope={{ React }} noInline>
          <LivePreview />
        </LiveProvider>
      );

      expect(screen.getByText('Updated')).toBeInTheDocument();
    });
  });
});

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
    expect(normalized).toContain('className="price-tag"');
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
    expect(normalized).toContain('onClick={handleClick}');
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
    expect(normalized).toContain('cn("base-class"');
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
    expect(normalized).toContain('cn("flex items-center gap-2"');
    // Should have exactly one render call
    expect(normalized.match(/render\(/g).length).toBe(1);
    // Should use React.createElement in the render call
    expect(normalized).toContain('render(React.createElement(PriceTag))');
  });
}); 
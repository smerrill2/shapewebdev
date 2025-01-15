import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import LivePreview from '../components/LivePreview';

describe('LivePreview', () => {
  it('evaluates and renders a valid component', async () => {
    const testComponents = [
      {
        name: 'TestComponent',
        code: 'const TestComponent = () => <div>Test Content</div>; export default TestComponent;'
      }
    ];

    await act(async () => {
      render(
        <LivePreview
          componentList={testComponents}
        />
      );
    });

    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('handles evaluation errors', async () => {
    const invalidComponents = [
      {
        name: 'InvalidComponent',
        code: 'invalid code'
      }
    ];

    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    await act(async () => {
      render(
        <LivePreview
          componentList={invalidComponents}
        />
      );
    });

    // Should show error message
    expect(screen.getByText(/Failed to evaluate component/i)).toBeInTheDocument();
    
    // Should have logged the error
    expect(consoleError).toHaveBeenCalledWith(
      expect.stringContaining('Failed to evaluate InvalidComponent'),
      expect.any(Error)
    );

    consoleError.mockRestore();
  });

  it('cleans up old cache entries', async () => {
    jest.useFakeTimers();

    const oldComponents = [
      {
        name: 'OldComponent',
        code: 'const OldComponent = () => <div>Old Content</div>; export default OldComponent;'
      }
    ];

    const newComponents = [
      {
        name: 'NewComponent',
        code: 'const NewComponent = () => <div>New Content</div>; export default NewComponent;'
      }
    ];

    const { rerender } = render(
      <LivePreview
        componentList={oldComponents}
      />
    );

    // Wait for initial render
    await waitFor(() => {
      expect(screen.getByText('Old Content')).toBeInTheDocument();
    });

    // Advance time past cache timeout
    act(() => {
      jest.advanceTimersByTime(60000);
    });

    // Render new components
    await act(async () => {
      rerender(
        <LivePreview
          componentList={newComponents}
        />
      );
    });

    // Old content should be gone, new content should be visible
    expect(screen.queryByText('Old Content')).not.toBeInTheDocument();
    expect(screen.getByText('New Content')).toBeInTheDocument();
    
    jest.useRealTimers();
  });

  it('handles dependent components', async () => {
    const components = [
      {
        name: 'Button',
        code: 'const Button = ({children}) => <button data-testid="button-component">{children}</button>; export default Button;'
      },
      {
        name: 'Header',
        code: `
          const Header = () => {
            const Button = ({children}) => <button data-testid="header-button">{children}</button>;
            return <div data-testid="header-component"><Button>Click</Button></div>;
          };
          export default Header;
        `
      }
    ];

    await act(async () => {
      render(<LivePreview componentList={components} />);
    });

    // Should render both components correctly
    await waitFor(() => {
      expect(screen.getByTestId('header-button')).toHaveTextContent('Click');
      expect(screen.getByTestId('header-component')).toBeInTheDocument();
    });
  });

  it('handles buffered evaluation correctly', async () => {
    const rapidComponents = Array.from({ length: 5 }, (_, i) => ({
      name: `Component${i}`,
      code: `const Component${i} = () => <div data-testid="component-${i}">Content ${i}</div>; export default Component${i};`
    }));

    const { rerender } = render(
      <LivePreview
        componentList={[rapidComponents[0]]}
      />
    );

    // Rapidly update with new components
    for (let i = 1; i < rapidComponents.length; i++) {
      await act(async () => {
        rerender(
          <LivePreview
            componentList={rapidComponents.slice(0, i + 1)}
          />
        );
      });
    }

    // Wait for all evaluations to complete
    await waitFor(() => {
      // Last component should be rendered
      expect(screen.getByTestId(`component-${rapidComponents.length - 1}`))
        .toHaveTextContent(`Content ${rapidComponents.length - 1}`);
    });

    // Verify no evaluation errors occurred
    expect(screen.queryByText(/Failed to evaluate/i)).not.toBeInTheDocument();
  });

  it('recovers from evaluation errors', async () => {
    const components = [
      {
        name: 'BrokenComponent',
        code: 'invalid code that will fail'
      },
      {
        name: 'RecoveryComponent',
        code: 'const RecoveryComponent = () => <div data-testid="recovery">Recovered</div>; export default RecoveryComponent;'
      }
    ];

    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    const { rerender } = render(
      <LivePreview
        componentList={[components[0]]}
      />
    );

    // Wait for error state
    await waitFor(() => {
      expect(screen.getByText(/Failed to evaluate/i)).toBeInTheDocument();
    });

    // Attempt recovery with valid component
    await act(async () => {
      rerender(
        <LivePreview
          componentList={[components[1]]}
        />
      );
    });

    // Verify recovery
    await waitFor(() => {
      expect(screen.queryByText(/Failed to evaluate/i)).not.toBeInTheDocument();
      expect(screen.getByTestId('recovery')).toHaveTextContent('Recovered');
    });

    consoleError.mockRestore();
  });

  it('handles concurrent component evaluations', async () => {
    const components = [
      { 
        name: 'CompA', 
        code: 'const CompA = () => <div data-testid="preview-CompA">A</div>; export default CompA;' 
      },
      { 
        name: 'CompB', 
        code: 'const CompB = () => <div data-testid="preview-CompB">B</div>; export default CompB;' 
      }
    ];

    await act(async () => {
      render(<LivePreview componentList={components} />);
    });

    // Wait for both components to be evaluated and rendered
    await waitFor(() => {
      expect(screen.getByTestId('preview-CompA')).toBeInTheDocument();
      expect(screen.getByTestId('preview-CompB')).toBeInTheDocument();
    });

    // Verify correct content
    expect(screen.getByTestId('preview-CompA')).toHaveTextContent('A');
    expect(screen.getByTestId('preview-CompB')).toHaveTextContent('B');
  });
}); 
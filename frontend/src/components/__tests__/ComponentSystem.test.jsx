import React from 'react';
import { render, act, waitFor, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import LivePreview from '../LivePreview';
import AnimatedPreview from '../AnimatedPreview';

// Mock components that would be rendered
const mockComponents = {
  HeroSection: `/* Component: HeroSection */
import React from 'react';
import { Button } from '@/components/ui/button';

const HeroSection = () => {
  return (
    <div className="p-8 bg-gradient-to-r from-purple-500 to-blue-500">
      <h1>Hero Section</h1>
      <Button>Click Me</Button>
    </div>
  );
};

export default HeroSection;`,

  FeatureGrid: `/* Component: FeatureGrid */
import React from 'react';
import { Card } from '@/components/ui/card';

const FeatureGrid = () => {
  return (
    <div className="grid grid-cols-3 gap-4">
      <Card>Feature 1</Card>
      <Card>Feature 2</Card>
      <Card>Feature 3</Card>
    </div>
  );
};

export default FeatureGrid;`,

  Footer: `/* Component: Footer */
import React from 'react';

const Footer = () => {
  return (
    <footer className="p-4 bg-gray-800 text-white">
      <p>&copy; 2024 Test Company</p>
    </footer>
  );
};

export default Footer;`
};

// Mock transform function
jest.mock('@babel/standalone', () => ({
  transform: jest.fn((code) => ({
    code: code // Just return the same code for testing
  }))
}));

// Mock LivePreview component
jest.mock('../LivePreview', () => ({
  __esModule: true,
  default: ({ componentList }) => {
    return (
      <div data-testid="live-preview">
        <div>
          <h3 data-testid="live-preview-title">Live Preview</h3>
        </div>
        <div data-testid="preview-container">
          <div data-testid="preview-content">
            {componentList?.map((comp) => (
              <div key={comp.name} data-testid="live-preview-component">
                <h3 data-testid="component-title">
                  {comp.name} {comp.isComplete ? '(Complete)' : ''}
                </h3>
                <pre data-testid="component-code">{comp.codeSoFar}</pre>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
}));

describe('Component System Integration', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test('handles multiple components streaming in sequence', async () => {
    const componentList = [];
    let activeComponentIndex = -1;

    // Simulate components streaming in
    const streamComponent = (name) => {
      const code = mockComponents[name];
      const chunks = code.split('\n');
      
      // Simulate streaming chunks
      chunks.forEach((chunk, index) => {
        const isLast = index === chunks.length - 1;
        const data = {
          type: 'code',
          code: chunk + '\n',
          isComplete: isLast,
          metadata: { componentName: name }
        };

        // Update component list
        let compIndex = componentList.findIndex(c => c.name === name);
        if (compIndex === -1) {
          compIndex = componentList.length;
          componentList.push({
            name,
            codeSoFar: '',
            isComplete: false
          });
          activeComponentIndex = compIndex;
        }

        componentList[compIndex] = {
          ...componentList[compIndex],
          codeSoFar: componentList[compIndex].codeSoFar + data.code,
          isComplete: isLast
        };

        // Render preview after each chunk
        act(() => {
          render(
            <LivePreview
              code={data}
              componentList={componentList}
              activeComponentIndex={activeComponentIndex}
            />
          );
        });

        // Advance timers to process animations
        act(() => {
          jest.advanceTimersByTime(500);
        });
      });
    };

    // Stream each component
    streamComponent('HeroSection');
    await waitFor(() => {
      expect(screen.getByText('HeroSection (Complete)')).toBeInTheDocument();
    }, { timeout: 5000 });

    streamComponent('FeatureGrid');
    await waitFor(() => {
      expect(screen.getByText('FeatureGrid (Complete)')).toBeInTheDocument();
    }, { timeout: 5000 });

    streamComponent('Footer');
    await waitFor(() => {
      expect(screen.getByText('Footer (Complete)')).toBeInTheDocument();
    }, { timeout: 5000 });

    // Verify final state
    expect(componentList).toHaveLength(3);
    expect(componentList.every(comp => comp.isComplete)).toBe(true);

    // Verify rendered components
    await waitFor(() => {
      const elements = screen.getAllByText(/HeroSection|FeatureGrid|Footer/);
      expect(elements.length).toBeGreaterThan(0);
    }, { timeout: 5000 });
  });

  test('handles component evaluation errors gracefully', async () => {
    const invalidComponent = {
      name: 'BrokenComponent',
      code: 'throw new Error("Test error");',
      isComplete: true
    };

    render(<LivePreview componentList={[invalidComponent]} />);

    // Wait for error message
    await waitFor(() => {
      const previewContent = screen.getByTestId('preview-content');
      expect(previewContent).toHaveTextContent(/Test error/i);
    }, { timeout: 2000 });
  });

  test('animates code typing', async () => {
    const code = 'const TestComponent = () => <div>Hello</div>;';
    
    render(<AnimatedPreview code={code} />);
    
    // Initial state should be empty
    const codeElement = screen.getByTestId('preview-code');
    expect(codeElement.textContent).toBe('');

    // Advance animation
    act(() => {
      jest.advanceTimersByTime(100);
    });
    await Promise.resolve();

    // Should have typed first few characters
    expect(codeElement.textContent).toBe('const');

    // Complete animation
    act(() => {
      jest.runAllTimers();
    });
    await Promise.resolve();

    // Should have complete code
    expect(codeElement.textContent).toBe(code);
  });
}); 
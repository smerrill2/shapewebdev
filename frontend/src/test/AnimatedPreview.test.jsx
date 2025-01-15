import { render, screen, waitFor } from '@testing-library/react';
import { act } from '@testing-library/react';
import AnimatedPreview from '../components/AnimatedPreview';

describe('AnimatedPreview', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const normalizeCode = (text) => {
    // Remove trailing semicolons and normalize whitespace
    return text.replace(/;?\s*$/, '').replace(/\s+/g, ' ').trim();
  };

  it('animates code typing', async () => {
    const testCode = '/* Component: Test */\nconst Test = () => {};';
    
    await act(async () => {
      render(
        <AnimatedPreview
          code={testCode}
          typingSpeed={50}
        />
      );
    });

    // Initial state should show first character and progress bar
    const previewCode = screen.getByTestId('preview-code');
    expect(previewCode.querySelector('code')).toHaveTextContent('/');
    expect(previewCode.querySelector('.bg-slate-800')).toBeTruthy();
    expect(previewCode.querySelector('.bg-blue-500')).toBeTruthy();

    // Advance animations
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    // Should show partial content
    expect(screen.getByTestId('preview-code')).toHaveTextContent('/* Component');

    // Complete animation
    await act(async () => {
      jest.advanceTimersByTime(2000);
    });

    // Should show full content (normalized)
    const expectedText = normalizeCode(testCode);
    const actualText = normalizeCode(screen.getByTestId('preview-code').textContent);
    expect(actualText).toBe(expectedText);
  });

  it('handles typing speed variations', async () => {
    const testCode = 'console.log("fast typing");';
    
    await act(async () => {
      render(
        <AnimatedPreview
          code={testCode}
          typingSpeed={10}
        />
      );
    });

    // Initial state should show first character and progress bar
    const previewCode = screen.getByTestId('preview-code');
    expect(previewCode.querySelector('code')).toHaveTextContent('c');
    expect(previewCode.querySelector('.bg-slate-800')).toBeTruthy();
    expect(previewCode.querySelector('.bg-blue-500')).toBeTruthy();

    // Fast typing should complete quickly
    await act(async () => {
      jest.advanceTimersByTime(500);
    });

    // Should show full content (normalized)
    const expectedText = normalizeCode(testCode);
    const actualText = normalizeCode(screen.getByTestId('preview-code').textContent);
    expect(actualText).toBe(expectedText);
  });

  it('handles animation errors gracefully', async () => {
    const mockError = new Error('Animation error');
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    const originalSetTimeout = global.setTimeout;
    
    global.setTimeout = jest.fn().mockImplementation(() => {
      throw mockError;
    });

    await act(async () => {
      render(
        <AnimatedPreview
          code="test code"
          typingSpeed={50}
        />
      );
    });

    // Should show error message
    expect(screen.getByText(/Animation Error:/)).toBeInTheDocument();
    expect(screen.getByText(/Animation error/)).toBeInTheDocument();

    // Should have logged the error
    expect(consoleError).toHaveBeenCalledWith(
      'Animation error:',
      mockError
    );

    global.setTimeout = originalSetTimeout;
    consoleError.mockRestore();
  });

  it('handles component transitions smoothly', async () => {
    const { rerender } = render(
      <AnimatedPreview
        code="const A = () => {}"
        componentName="ComponentA"
        isComplete={false}
      />
    );

    // Wait for initial render
    const previewCode = screen.getByTestId('preview-code');
    expect(previewCode.querySelector('code')).toHaveTextContent('c');

    // Trigger transition
    await act(async () => {
      rerender(
        <AnimatedPreview
          code="const B = () => {}"
          componentName="ComponentB"
          isComplete={false}
          transitionState={{
            from: 'ComponentA',
            to: 'ComponentB',
            timestamp: Date.now()
          }}
        />
      );
    });

    // Check transition classes
    expect(screen.getByTestId('animated-preview')).toHaveClass('animate-slide-in');
    
    // Verify new content starts animating
    await act(async () => {
      jest.advanceTimersByTime(500);
    });
    
    expect(screen.getByTestId('preview-code')).toHaveTextContent('const B');
  });

  it('handles interruptions during animation', async () => {
    const initialCode = 'const A = () => {};';
    const interruptedCode = 'const B = () => {};';
    
    const { rerender } = render(
      <AnimatedPreview
        code={initialCode}
        typingSpeed={50}
        isComplete={false}
      />
    );

    // Start initial animation
    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    // Interrupt with new code mid-animation
    await act(async () => {
      rerender(
        <AnimatedPreview
          code={interruptedCode}
          typingSpeed={50}
          isComplete={false}
          transitionState={{
            from: 'ComponentA',
            to: 'ComponentB',
            timestamp: Date.now()
          }}
        />
      );
    });

    // Verify animation resets and starts new content
    const previewCode = screen.getByTestId('preview-code');
    expect(previewCode.querySelector('code')).toHaveTextContent('c');
    
    // Complete new animation
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    // Verify final content matches interrupted code
    const expectedText = normalizeCode(interruptedCode);
    const actualText = normalizeCode(screen.getByTestId('preview-code').textContent);
    expect(actualText).toBe(expectedText);
  });

  it('handles animation interruption gracefully', async () => {
    const initialCode = 'const A = () => {};';
    const newCode = 'const B = () => {};';
    
    const { rerender } = render(
      <AnimatedPreview code={initialCode} />
    );

    // Start first animation
    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    // Interrupt with new code
    await act(async () => {
      rerender(<AnimatedPreview code={newCode} />);
    });

    // Verify animation reset
    const previewCode = screen.getByTestId('preview-code');
    expect(previewCode.querySelector('code')).toHaveTextContent('c');

    // Complete new animation
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    // Verify clean transition to new code
    const expectedText = normalizeCode(newCode);
    const actualText = normalizeCode(screen.getByTestId('preview-code').textContent);
    expect(actualText).toBe(expectedText);
  });
}); 
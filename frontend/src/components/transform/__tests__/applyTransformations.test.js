import { applyTransformations } from '../applyTransformations';
import { setupConsoleMocks, setupDevMode, emptyInputTestCases, runTestCases } from './testUtils';

describe('applyTransformations', () => {
  setupConsoleMocks();
  setupDevMode();

  // Empty input tests
  runTestCases(emptyInputTestCases, applyTransformations);

  const testCases = [
    {
      name: 'runs the entire pipeline (cleanCode → fixIncompleteJSX → injectTestIds)',
      input: `/// START Example
function Example() {
  return <div style={{color:'red'}} >Hello</div>
}
/// END Example`,
      options: { testId: 'example-123' },
      expected: (out) => {
        // 1. Markers should be removed
        expect(out).not.toMatch(/\/\/\/\s*START/);
        expect(out).not.toMatch(/\/\/\/\s*END/);

        // 2. Function should be preserved with proper structure
        expect(out).toMatch(/function Example\(\) {/);
        expect(out).toMatch(/return \(<div/);

        // 3. Style attribute should be preserved and properly formatted
        expect(out).toMatch(/style=\{\{color:'red'\}\}/);

        // 4. Content should be preserved
        expect(out).toMatch(/>Hello</);

        // 5. Tags should be properly closed
        expect(out).toMatch(/<\/div>/);

        // 6. Test ID should match what was provided
        expect(out).toMatch(/data-testid="example-123"/);

        // 7. Should NOT have React import or final render call
        expect(out).not.toMatch(/import React/);
        expect(out).not.toMatch(/\(\) => <Example/);
      }
    },
    {
      name: 'fixes malformed JSX and adds default test ID',
      input: `/// START Example
function Example() {
  return <div 
    style={{color:'red' 
  >
    Hello 
  }
/// END Example`,
      expected: (out) => {
        // Should fix the malformed JSX
        expect(out).toMatch(/style=\{\{color:'red'\}\}/);
        expect(out).toMatch(/>Hello</);
        expect(out).toMatch(/<\/div>/);

        // Should add default test ID based on component name
        expect(out).toMatch(/data-testid="example"/);
      }
    },
    {
      name: 'respects existing testId in the snippet if no testId is passed in options',
      input: `/// START MyPanel
function MyPanel() {
  return <div data-testid="panel-abc">Panel</div>;
}
/// END MyPanel
`,
      expected: (out) => {
        // Existing one is kept
        expect(out).toContain('data-testid="panel-abc"');
        // Should not add a second data-testid
        const countTestId = (out.match(/data-testid=/g) || []).length;
        expect(countTestId).toBe(1);
      }
    }
  ];

  runTestCases(testCases, applyTransformations);

  describe('Error handling', () => {
    it('handles code that triggers fallback in error case', () => {
      // Force an error by giving nonsense
      const code = `this is not valid code???? $$ ??? <div ???`;
      const out = applyTransformations(code);
      // Because of errors, it might try `cleanCodeForLive` or fallback
      // We mostly want to ensure it doesn't crash or throw
      expect(typeof out).toBe('string');
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('Development mode logging', () => {
    it('logs debug info in development mode', () => {
      const code = `/// START DebugTest
function DebugTest() {
  return <div>Debug</div>;
}
/// END DebugTest
`;
      applyTransformations(code);
      // Checking logs
      expect(console.group).toHaveBeenCalledWith('Starting code cleaning');
      expect(console.log).toHaveBeenCalledWith('Code length:', expect.any(Number));
    });
  });
}); 
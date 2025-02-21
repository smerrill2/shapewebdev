import { applyTransformations } from '../applyTransformations';

describe('applyTransformations', () => {
  let originalEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = process.env.NODE_ENV;
    // Set development mode
    process.env.NODE_ENV = 'development';
    // Mock console methods
    console.group = jest.fn();
    console.log = jest.fn();
    console.groupEnd = jest.fn();
    console.error = jest.fn();
    console.warn = jest.fn();
  });

  afterEach(() => {
    // Restore original environment
    process.env.NODE_ENV = originalEnv;
    // Reset console mocks
    jest.resetAllMocks();
  });

  it('returns empty string if no code is passed', () => {
    expect(applyTransformations(null)).toBe('');
    expect(applyTransformations(undefined)).toBe('');
    expect(applyTransformations('')).toBe('');
  });

  it('runs the entire pipeline (cleanCode → fixIncompleteJSX → injectTestIds)', () => {
    const code = `/// START Example
function Example() {
  return <div style={{color:'red'}} >Hello</div>
}
/// END Example`;
    
    const out = applyTransformations(code, { testId: 'example-123' });

    // 1. Markers should be removed
    expect(out).not.toMatch(/\/\/\/\s*START/);
    expect(out).not.toMatch(/\/\/\/\s*END/);

    // 2. React import should be present
    expect(out).toMatch(/^import React from "react";/);

    // 3. Function should be preserved with proper structure
    expect(out).toMatch(/function Example\(\) {/);
    expect(out).toMatch(/return \(<div/);

    // 4. Style attribute should be preserved and properly formatted
    expect(out).toMatch(/style=\{\{color:'red'\}\}/);

    // 5. Content should be preserved
    expect(out).toMatch(/>Hello</);

    // 6. Tags should be properly closed
    expect(out).toMatch(/<\/div>/);

    // 7. Test ID should match what was provided
    expect(out).toMatch(/data-testid="example-123"/);

    // 8. Should have a proper render call
    expect(out).toMatch(/\(\) => <Example/);
  });

  it('fixes malformed JSX and adds default test ID', () => {
    const code = `/// START Example
function Example() {
  return <div 
    style={{color:'red' 
  >
    Hello 
  }
/// END Example`;
    
    const out = applyTransformations(code); // no testId provided

    // Should fix the malformed JSX
    expect(out).toMatch(/style=\{\{color:'red'\}\}/);
    expect(out).toMatch(/>Hello</);
    expect(out).toMatch(/<\/div>/);

    // Should add default test ID based on component name
    expect(out).toMatch(/data-testid="example"/);
  });

  it('respects existing testId in the snippet if no testId is passed in options', () => {
    const code = `/// START MyPanel
function MyPanel() {
  return <div data-testid="panel-abc">Panel</div>;
}
/// END MyPanel
`;
    const out = applyTransformations(code); // no explicit testId passed
    // Existing one is kept
    expect(out).toContain('data-testid="panel-abc"');
    // Should not add a second data-testid
    const countTestId = (out.match(/data-testid=/g) || []).length;
    expect(countTestId).toBe(1);
  });

  it('handles code that triggers fallback in error case', () => {
    // Force an error by giving nonsense
    const code = `this is not valid code???? $$ ??? <div ???`;
    const out = applyTransformations(code);
    // Because of errors, it might try `cleanCodeForLive` or fallback
    // We mostly want to ensure it doesn't crash or throw
    expect(typeof out).toBe('string');
  });

  it('logs debug info in development mode', () => {
    const code = `/// START DebugTest
function DebugTest() {
  return <div>Debug</div>;
}
/// END DebugTest
`;
    const out = applyTransformations(code);
    // Checking logs
    expect(console.group).toHaveBeenCalledWith('Starting code cleaning');
    expect(console.log).toHaveBeenCalledWith('Code length:', expect.any(Number));
  });
}); 
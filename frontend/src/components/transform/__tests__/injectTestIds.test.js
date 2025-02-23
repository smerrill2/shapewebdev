import { injectTestIds } from '../injectTestIds';
import { setupConsoleMocks, emptyInputTestCases, runTestCases } from './testUtils';

describe('injectTestIds', () => {
  setupConsoleMocks();

  // Empty input tests
  runTestCases(emptyInputTestCases, injectTestIds);

  const testCases = [
    {
      name: 'adds a test ID if no root-level data-testid is present',
      input: `function Header() {
        return (<header>Hi</header>);
      }`,
      options: { testId: 'header-component' },
      expected: (out) => expect(out).toMatch(/return \(<header data-testid="header-component">Hi<\/header>\);/)
    },
    {
      name: 'respects existing data-testid in the root element',
      input: `function Example() {
        return (<div data-testid="existing">Content</div>);
      }`,
      options: { testId: 'new-id' },
      expected: (out) => {
        expect(out).toMatch(/data-testid="existing"/);
        expect(out).not.toMatch(/data-testid="new-id"/);
      }
    },
    {
      name: 'detects function name for testId if none is provided in options',
      input: `function ButtonTest() {
        return (<button>Click</button>);
      }`,
      expected: (out) => expect(out).toMatch(/return \(<button data-testid="buttontest">Click<\/button>\);/)
    },
    {
      name: 'works for variable declarations with uppercase name',
      input: `const SpecialBox = () => {
        return (<div>Boxy</div>);
      }`,
      expected: (out) => expect(out).toMatch(/return \(<div data-testid="specialbox">Boxy<\/div>\);/)
    }
  ];

  runTestCases(testCases, injectTestIds);

  describe('Error handling', () => {
    it('handles invalid JSX gracefully', () => {
      const invalidCode = '<div><span></div>';
      expect(() => injectTestIds(invalidCode)).not.toThrow();
      expect(console.error).toHaveBeenCalled();
    });

    it('handles non-JSX code gracefully', () => {
      const nonJsxCode = 'const x = 42;';
      expect(() => injectTestIds(nonJsxCode)).not.toThrow();
      expect(console.error).toHaveBeenCalled();
    });
  });
}); 
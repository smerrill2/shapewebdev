import { fixIncompleteJSX } from '../fixIncompleteJSX';
import { setupConsoleMocks, emptyInputTestCases, runTestCases } from './testUtils';

describe('fixIncompleteJSX', () => {
  setupConsoleMocks();

  // Empty input tests
  runTestCases(emptyInputTestCases, fixIncompleteJSX);

  const testCases = [
    {
      name: 'fixes incomplete attributes (e.g. style, event handlers) with missing braces',
      input: `function IncompleteAttr() {
        return <button onClick={handleClick>
          Click me
        </button>;
      }`,
      expected: (out) => expect(out).toMatch(/onClick=\{handleClick\}/)
    },
    {
      name: 'adds missing closing tags in reverse order for nested tags',
      input: `function NestedTags() {
        return <section>
          <div><span>Hello
        </section>;
      }`,
      expected: (out) => expect(out).toMatch(/<span>Hello<\/span>\s*<\/div>\s*<\/section>/)
    },
    {
      name: 'fixes incomplete array methods, e.g. .map( missing )} etc.',
      input: `function ListThing() {
        const items = [1,2,3];
        return <ul>
          {items.map(item => <li>Item {item}
        </ul>;
      }`,
      expected: (out) => expect(out).toMatch(/items\.map\(item => <li>Item \{item\}<\/li>\)\)/)
    },
    {
      name: 'completes incomplete ternary expressions with : null',
      input: `function Ternary() {
        return <div>
          {true ? <span>Yes</span>}
        </div>;
      }`,
      expected: (out) => expect(out).toMatch(/\? <span>Yes<\/span> : null/)
    },
    {
      name: 'fixes incomplete style attributes',
      input: `function StyleTest() {
        return <div style={{color:'red'>Hello</div>;
      }`,
      expected: (out) => expect(out).toMatch(/style=\{\{color:'red'\}\}/)
    }
  ];

  runTestCases(testCases, fixIncompleteJSX);

  describe('Object declaration tests', () => {
    const objectTestCases = [
      {
        name: 'balances curly braces in basic object declarations',
        input: `const data = { name: "test"
return <div>{data.name}</div>`,
        expected: (out) => {
          expect(out).toMatch(/\};/);
          expect(out).toMatch(/name:\s*"test"/);
        }
      },
      {
        name: 'handles empty object declarations',
        input: `const data = {
return <div>test</div>`,
        expected: (out) => expect(out).toMatch(/\{\s*\};/)
      }
    ];

    runTestCases(objectTestCases, fixIncompleteJSX);
  });

  describe('Error handling', () => {
    beforeEach(() => {
      console.error = jest.fn();
    });

    afterEach(() => {
      jest.resetAllMocks();
    });

    it('handles error cases appropriately', () => {
      // Create a malformed JSX that will definitely cause a parse error
      const invalidCode = `
        function BrokenComponent() {
          return (
            <div>
              {[1,2,3].map(x => 
                <span key={x}>{x</span> // Missing closing brace
              )}
              <p class="test" {color: red}> // Invalid attribute syntax
                {(() => { // Incomplete IIFE
              </p>
            </div>
          );
        }
      `;
      expect(() => fixIncompleteJSX(invalidCode)).not.toThrow();
      expect(console.error).toHaveBeenCalled();
    });
  });
}); 
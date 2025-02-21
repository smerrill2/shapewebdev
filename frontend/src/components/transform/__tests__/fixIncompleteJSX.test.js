import { fixIncompleteJSX } from '../fixIncompleteJSX';

describe('fixIncompleteJSX', () => {
  it('returns empty string if null or undefined', () => {
    expect(fixIncompleteJSX(null)).toBe('');
    expect(fixIncompleteJSX('')).toBe('');
  });

  it('inserts missing React import if needed', () => {
    const code = `function Demo() {
  return <div>Hello</div>;
}`;
    const out = fixIncompleteJSX(code);
    expect(out).toMatch(/import React from "react";/);
  });

  it('fixes incomplete attributes (e.g. style, event handlers) with missing braces', () => {
    const code = `import React from "react";

function IncompleteAttr() {
  return (
    <button onClick={handleClick>
      Click me
    </button>
  );
}`;
    const out = fixIncompleteJSX(code);
    // We expect `onClick={handleClick}`
    expect(out).toMatch(/onClick=\{\s*handleClick\s*\}/);
  });

  it('adds missing closing tags in reverse order for nested tags', () => {
    const code = `import React from "react";
function NestedTags() {
  return (
    <section>
      <div><span>Hello
    </section>`;
    const out = fixIncompleteJSX(code);
    // Should auto-close <span> then <div>
    expect(out).toMatch(/<span>Hello<\/span>\s*<\/div>\s*<\/section>/);
  });

  it('fixes incomplete array methods, e.g. .map( missing )} etc.', () => {
    const code = `import React from "react";
function ListThing() {
  const items = [1,2,3];
  return (
    <ul>
      {items.map(item => <li>Item {item}
    </ul>
  );
}`;
    const out = fixIncompleteJSX(code);
    // Expect .map(...) to be closed with ')}' and proper li closure
    expect(out).toMatch(/items\.map\(item => <li>Item \{item\}<\/li>\)\)\}/);
  });

  it('completes incomplete ternary expressions with : null', () => {
    const code = `import React from "react";
function Ternary() {
  return (
    <div>
      {true ? <span>Yes</span>
    </div>
  );
}`;
    const out = fixIncompleteJSX(code);
    expect(out).toMatch(/\? <span>Yes<\/span> : null/);
  });

  it('adds missing closing HTML tags for known elements (e.g., <div>)', () => {
    const code = `import React from "react";
function MissingDivClose() {
  return (
    <div><p>Hello
  );
}`;
    const out = fixIncompleteJSX(code);
    // Expect </p></div> to be appended
    expect(out).toMatch(/Hello<\/p><\/div>/);
  });

  it('balances curly braces in object declarations', () => {
    const testCases = [
      // Basic case: unclosed object
      {
        input: `const data = { name: "test"
return <div>{data.name}</div>`,
        expected: (out) => {
          // Should have a closing brace
          expect(out).toMatch(/\}/);
          // Should preserve the object content
          expect(out).toMatch(/name:\s*"test"/);
          // Should preserve the return statement (allowing for parentheses)
          expect(out).toMatch(/return\s*[(<]?\s*<div>/);
        }
      },
      // Empty object
      {
        input: `const data = {
return <div>test</div>`,
        expected: (out) => {
          // Should close the empty object
          expect(out).toMatch(/\{[^}]*\}/);
          // Should preserve the return statement (allowing for parentheses)
          expect(out).toMatch(/return\s*[(<]?\s*<div>/);
        }
      }
    ];

    testCases.forEach(({ input, expected }) => {
      const out = fixIncompleteJSX(input);
      expected(out);
    });
  });
}); 
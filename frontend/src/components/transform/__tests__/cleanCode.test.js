import { cleanCode, cleanCodeForLive } from '../cleanCode';

describe('cleanCode', () => {
  it('returns empty string if no code is passed', () => {
    expect(cleanCode(null)).toBe('');
    expect(cleanCode(undefined)).toBe('');
  });

  it('returns original code if no START marker is found', () => {
    const code = `function Example() {
      return <div>Hello World</div>;
    }`;
    expect(cleanCode(code)).toBe(code);
  });

  it('returns original code if START marker found but no END marker', () => {
    const code = `/// START Example
function Example() {
  return <div>Only Start Marker</div>;
}
`;
    // Since end marker isn't found, it should just return the original
    expect(cleanCode(code)).toBe(code);
  });

  it('extracts code between START/END markers and preserves imports', () => {
    const code = `import React from "react";
import { Button } from './ui/button';

/// START MyComponent position=main
import { Card } from './ui/card';

function MyComponent() {
  return <Card>Hello!</Card>;
}
/// END MyComponent

const garbage = "should not appear";
`;
    const cleaned = cleanCode(code);
    // We expect the result to include the React import and the local import from inside
    expect(cleaned).toMatch(/import React from "react";/);
    expect(cleaned).toMatch(/import { Card } from '.\/ui\/card';/);
    // We do not expect the 'garbage' line
    expect(cleaned).not.toMatch(/garbage/);
    // We should see the final render call appended if it's missing
    expect(cleaned).toMatch(/\(\) => <MyComponent data-testid="mycomponent" \/>/);
  });

  it('adds missing React import if none found', () => {
    const code = `/// START Hello
function Hello() {
  return <div>Hi!</div>;
}
/// END Hello
`;
    const cleaned = cleanCode(code);
    expect(cleaned).toMatch(/import React from "react";/);
  });

  it('respects existing testId if present in the snippet', () => {
    const code = `import React from "react";
/// START FancyCard
function FancyCard() {
  return <div data-testid="fancy-card">Fancy</div>;
}
/// END FancyCard
`;
    const cleaned = cleanCode(code);
    // The final snippet shouldn't overwrite the existing test ID
    expect(cleaned).toContain('data-testid="fancy-card"');
    // Should not add a second test ID to the same element
    const countTestId = (cleaned.match(/data-testid=/g) || []).length;
    expect(countTestId).toBe(1);
  });

  it('appends a render call if none is found', () => {
    const code = `import React from "react";
/// START MyOtherComponent
function MyOtherComponent() {
  return <section>Some content</section>;
}
/// END MyOtherComponent
`;
    const result = cleanCode(code);
    // We expect a final line with "() => <MyOtherComponent data-testid="myothercomponent" />"
    expect(result).toMatch(/\(\) => <MyOtherComponent data-testid="myothercomponent" \/>/);
  });
});

describe('cleanCodeForLive', () => {
  it('returns empty string if START is present but END is missing', () => {
    const snippet = `/// START PartialComponent
function PartialComponent() {
  return <div>Loading</div>
`;
    // No END marker
    const out = cleanCodeForLive(snippet, 'PartialComponent');
    expect(out).toBe(''); // indicates incomplete code
  });

  it('extracts snippet between markers using advanced regex', () => {
    const code = `/// START SuperSection position=main
function SuperSection() {
  return <div>Super!</div>;
}
/// END SuperSection
export function AnotherThing() { return <span>Ignore me</span>; }`;

    const out = cleanCodeForLive(code, 'SuperSection');
    // Should only contain the function SuperSection
    expect(out).toMatch(/function SuperSection\(\)/);
    expect(out).not.toMatch(/AnotherThing/);
  });

  it('warns if componentName mismatch occurs', () => {
    console.warn = jest.fn();

    const code = `/// START NotTheSame
function NotTheSame() {
  return <p>Mismatch</p>;
}
/// END NotTheSame
`;
    // Provide a different name
    cleanCodeForLive(code, 'DifferentComponent');
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('Component name mismatch')
    );
  });
}); 
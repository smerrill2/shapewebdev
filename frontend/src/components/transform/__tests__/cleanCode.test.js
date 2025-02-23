import { cleanCode, cleanCodeForLive } from '../cleanCode';
import { setupConsoleMocks, setupDevMode, emptyInputTestCases, runTestCases } from './testUtils';

describe('cleanCode', () => {
  setupConsoleMocks();
  setupDevMode();

  // Empty input tests
  runTestCases(emptyInputTestCases, cleanCode);

  const testCases = [
    {
      name: 'returns original code if no START marker is found',
      input: `function Example() {
        return <div>Hello World</div>;
      }`,
      expected: (out) => expect(out).toBe(out)
    },
    {
      name: 'returns original code if START marker found but no END marker',
      input: `/// START Example
function Example() {
  return <div>Only Start Marker</div>;
}
`,
      expected: (out) => expect(out).toBe(out)
    },
    {
      name: 'extracts code between START/END markers and preserves imports',
      input: `import React from "react";
import { Button } from './ui/button';

/// START MyComponent position=main
import { Card } from './ui/card';

function MyComponent() {
  return <Card>Hello!</Card>;
}
/// END MyComponent

const garbage = "should not appear";
`,
      expected: (out) => {
        expect(out).toMatch(/import React from "react";/);
        expect(out).toMatch(/import { Card } from '.\/ui\/card';/);
        expect(out).not.toMatch(/garbage/);
        expect(out).toMatch(/\(\) => <MyComponent data-testid="mycomponent" \/>/);
      }
    },
    {
      name: 'adds missing React import if none found',
      input: `/// START Hello
function Hello() {
  return <div>Hi!</div>;
}
/// END Hello
`,
      expected: (out) => expect(out).toMatch(/import React from "react";/)
    },
    {
      name: 'respects existing testId if present in the snippet',
      input: `import React from "react";
/// START FancyCard
function FancyCard() {
  return <div data-testid="fancy-card">Fancy</div>;
}
/// END FancyCard
`,
      expected: (out) => {
        expect(out).toContain('data-testid="fancy-card"');
        const countTestId = (out.match(/data-testid=/g) || []).length;
        expect(countTestId).toBe(1);
      }
    },
    {
      name: 'appends a render call if none is found',
      input: `import React from "react";
/// START MyOtherComponent
function MyOtherComponent() {
  return <section>Some content</section>;
}
/// END MyOtherComponent
`,
      expected: (out) => expect(out).toMatch(/\(\) => <MyOtherComponent data-testid="myothercomponent" \/>/),
    }
  ];

  runTestCases(testCases, cleanCode);
});

describe('cleanCodeForLive', () => {
  setupConsoleMocks();

  const testCases = [
    {
      name: 'returns empty string if START is present but END is missing',
      input: `/// START PartialComponent
function PartialComponent() {
  return <div>Loading</div>
`,
      options: { componentName: 'PartialComponent' },
      expected: ''
    },
    {
      name: 'extracts snippet between markers using advanced regex',
      input: `/// START SuperSection position=main
function SuperSection() {
  return <div>Super!</div>;
}
/// END SuperSection
export function AnotherThing() { return <span>Ignore me</span>; }`,
      options: { componentName: 'SuperSection' },
      expected: (out) => {
        expect(out).toMatch(/function SuperSection\(\)/);
        expect(out).not.toMatch(/AnotherThing/);
      }
    },
    {
      name: 'warns if componentName mismatch occurs',
      input: `/// START NotTheSame
function NotTheSame() {
  return <p>Mismatch</p>;
}
/// END NotTheSame
`,
      options: { componentName: 'DifferentComponent' },
      expected: (out) => {
        expect(console.warn).toHaveBeenCalledWith(
          expect.stringContaining('Component name mismatch')
        );
      }
    }
  ];

  runTestCases(testCases, cleanCodeForLive);
}); 
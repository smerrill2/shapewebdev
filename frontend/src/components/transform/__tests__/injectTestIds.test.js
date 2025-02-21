import { injectTestIds } from '../injectTestIds';

describe('injectTestIds', () => {
  it('does nothing if code is empty', () => {
    const out = injectTestIds('', { testId: 'test' });
    expect(out).toBe('');
  });

  it('adds a test ID if no root-level data-testid is present', () => {
    const code = `function Header() {
  return <header>Hi</header>;
}`;
    const out = injectTestIds(code, { testId: 'header-component' });
    expect(out).toMatch(/<header data-testid="header-component">Hi<\/header>/);
  });

  it('respects existing data-testid in the root element', () => {
    const code = `function Header() {
  return <header data-testid="already-set">Hi</header>;
}`;
    const out = injectTestIds(code, { testId: 'new-id' });
    // Should NOT overwrite
    expect(out).toMatch(/<header data-testid="already-set">/);
    expect(out).not.toMatch(/new-id/);
  });

  it('detects function name for testId if none is provided in options', () => {
    const code = `function ButtonTest() {
  return <button>Click</button>;
}`;
    const out = injectTestIds(code, {}); // no testId passed
    // Should fallback to the function name
    expect(out).toMatch(/<button data-testid="buttontest">Click<\/button>/);
  });

  it('works for variable declarations with uppercase name', () => {
    const code = `const SpecialBox = () => {
  return <div>Boxy</div>;
}`;
    const out = injectTestIds(code, {});
    // fallback ID should be "specialbox"
    expect(out).toMatch(/data-testid="specialbox"/);
  });

  it('inserts a final render call if no explicit usage is found', () => {
    // This tests the "removeExistingRenderCalls" + final appended expression
    const code = `function Panel() {
  return <aside>Panel</aside>;
}`;
    const out = injectTestIds(code, { testId: 'panel-1' });
    expect(out).toMatch(/\(\) => <Panel data-testid="panel-1" \/>/);
  });

  it('keeps existing import React if present, otherwise inserts it', () => {
    let code = `function ImportMissing() {
      return <div>Needs import</div>;
    }`;
    let out = injectTestIds(code, { testId: 'mytest' });
    expect(out).toMatch(/import React from "react";/);

    code = `import React from "react";
function ImportFound() {
  return <div>Got import</div>;
}`;
    out = injectTestIds(code, { testId: 'mytest2' });
    // Should only have one import React line
    const countImports = (out.match(/import React/g) || []).length;
    expect(countImports).toBe(1);
  });
}); 
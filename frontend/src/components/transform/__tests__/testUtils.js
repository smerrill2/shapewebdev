// Common test utilities for transform tests

// Console mock setup
export function setupConsoleMocks() {
  const originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    group: console.group,
    groupEnd: console.groupEnd
  };

  beforeEach(() => {
    console.log = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
    console.group = jest.fn();
    console.groupEnd = jest.fn();
  });

  afterEach(() => {
    console.log = originalConsole.log;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
    console.group = originalConsole.group;
    console.groupEnd = originalConsole.groupEnd;
    jest.resetAllMocks();
  });
}

// Development mode setup
export function setupDevMode() {
  let originalEnv;

  beforeEach(() => {
    originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });
}

// Common test cases for empty/null input
export const emptyInputTestCases = [
  { name: 'handles null input', input: null, expected: '' },
  { name: 'handles undefined input', input: undefined, expected: '' },
  { name: 'handles empty string', input: '', expected: '' }
];

// Helper to run test cases
export function runTestCases(testCases, transformFn) {
  testCases.forEach(({ name, input, expected, options = {} }) => {
    it(name, () => {
      if (typeof expected === 'function') {
        expected(transformFn(input, options));
      } else {
        expect(transformFn(input, options)).toBe(expected);
      }
    });
  });
} 
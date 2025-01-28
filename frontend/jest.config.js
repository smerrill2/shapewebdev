module.exports = {
  testEnvironment: 'jsdom',
  testTimeout: 30000,
  transform: {
    '^.+\\.(js|jsx)$': 'babel-jest',
    '^.+\\.mjs$': 'babel-jest',
    'node_modules/msw/.+\\.(j|t)sx?$': 'babel-jest',
    'node_modules/@bundled-es-modules/.+\\.(j|t)sx?$': 'babel-jest'
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(react-day-picker|date-fns|@heroicons|lucide-react|msw|@bundled-es-modules|@testing-library|statuses|@anthropic-ai|tough-cookie)/)'
  ],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '^@bundled-es-modules/tough-cookie$': '<rootDir>/node_modules/@bundled-es-modules/tough-cookie/index-esm.js',
    '^@bundled-es-modules/tough-cookie/lib/cookie$': '<rootDir>/node_modules/@bundled-es-modules/tough-cookie/lib/cookie.js',
    '^@bundled-es-modules/tough-cookie/lib/memstore$': '<rootDir>/node_modules/@bundled-es-modules/tough-cookie/lib/memstore.js'
  },
  resolver: '<rootDir>/jest.resolver.js',
  setupFilesAfterEnv: [
    '<rootDir>/src/setupTests.js',
    '<rootDir>/jest.setup.js'
  ],
  globals: {
    'ts-jest': {
      useESM: true
    }
  }
};

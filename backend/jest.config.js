module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  verbose: true,
  setupFiles: [],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1'
  },
  transform: {},
  transformIgnorePatterns: [
    '/node_modules/',
    '\\.pnp\\.[^\\/]+$'
  ]
};

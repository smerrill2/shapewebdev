module.exports = {
  // The root directories for tests
  roots: ['<rootDir>/frontend/src', '<rootDir>/backend'],
  
  // Test environment
  testEnvironment: 'jsdom',
  
  // File extensions Jest will look for
  moduleFileExtensions: ['js', 'jsx', 'json', 'node'],
  
  // Test match patterns
  testMatch: [
    '**/__tests__/**/*.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)'
  ],
  
  // Transform files with babel-jest
  transform: {
    '^.+\\.(js|jsx)$': ['babel-jest', { configFile: './.babelrc' }]
  },
  
  // Don't transform node_modules
  transformIgnorePatterns: [
    '/node_modules/(?!(@babel/runtime)/)'
  ],
  
  // Collect coverage from these directories
  collectCoverageFrom: [
    'frontend/src/**/*.{js,jsx}',
    'backend/**/*.js',
    '!**/node_modules/**',
    '!**/vendor/**'
  ],
  
  // Verbose output for better debugging
  verbose: true,
  
  // Setup files to run before tests
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js']
}; 
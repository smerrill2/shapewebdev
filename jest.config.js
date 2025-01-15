module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/components/(.*)$': '<rootDir>/frontend/src/components/$1',
    '^@/lib/(.*)$': '<rootDir>/frontend/src/lib/$1',
    '^@/utils/(.*)$': '<rootDir>/frontend/src/utils/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy'
  },
  testMatch: [
    '<rootDir>/frontend/src/**/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/frontend/src/**/*.{spec,test}.{js,jsx,ts,tsx}',
    '<rootDir>/backend/**/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/backend/**/*.{spec,test}.{js,jsx,ts,tsx}'
  ],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', {
      presets: [
        ['@babel/preset-env', { targets: { node: 'current' } }],
        ['@babel/preset-react', { runtime: 'automatic' }]
      ]
    }]
  },
  transformIgnorePatterns: [
    '/node_modules/',
    '^.+\\.module\\.(css|sass|scss)$'
  ],
  moduleFileExtensions: ['js', 'jsx', 'json', 'node']
}; 
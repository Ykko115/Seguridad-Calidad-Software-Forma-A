module.exports = {
  testEnvironment: 'jsdom',
  setupFiles: ['./src/test/setup.js'],
  moduleNameMapper: {
    '\\.(css|less|scss)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|svg)$': '<rootDir>/__mocks__/fileMock.js',
  },
  transform: {
    '^.+\\.(js|jsx|mjs)$': 'babel-jest',
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(material-react-table|@mui|sonner)/)',
  ],
  testMatch: ['<rootDir>/src/**/__tests__/**/*.test.{js,jsx}'],
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/src/__tests__/integration/'],
  testTimeout: 15000,
};

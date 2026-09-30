// Config Jest para pruebas de INTEGRACIÓN del frontend (plan EP1, 3.2.4).
// - testMatch: solo src/__tests__/integration/
// - customExportConditions: ['node'] -> MSW e interceptores usan sus builds
//   de Node (el build "browser" exige globales fetch/Request que jsdom no da).
// - testTimeout alto: los flujos completos renderizan MUI/MRT.
module.exports = {
  rootDir: __dirname,
  testEnvironment: 'jsdom',
  testEnvironmentOptions: {
    customExportConditions: ['node'],
  },
  setupFiles: ['./src/test/setup.integration.js'],
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
  testMatch: ['<rootDir>/src/__tests__/integration/**/*.test.jsx'],
  testTimeout: 20000,
};

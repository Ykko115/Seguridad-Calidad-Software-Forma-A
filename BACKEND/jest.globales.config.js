module.exports = {
  testEnvironment: "node",
  testMatch: ["**/tests/globales/**/*.test.js"],
  setupFiles: ["<rootDir>/tests/globales/setup.js"],
  setupFilesAfterEnv: [
    "<rootDir>/tests/setup.js",
    "<rootDir>/tests/globales/entorno.js",
  ],
  testTimeout: 60000,
  maxWorkers: 1,
};

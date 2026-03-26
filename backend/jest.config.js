module.exports = {
  rootDir: __dirname,
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  testMatch: ["**/*.test.js"],
  clearMocks: true,
  restoreMocks: true,
  resetMocks: false,
  setupFilesAfterEnv: ["<rootDir>/tests/setup.js"],
  coverageDirectory: "<rootDir>/coverage",
  collectCoverageFrom: [
    "routes/**/*.js",
    "middlewares/**/*.js",
    "services/**/*.js",
    "utils/**/*.js",
    "!**/server.js",
  ],
};

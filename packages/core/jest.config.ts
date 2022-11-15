module.exports = {
  collectCoverage: false,
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: [['lcov']],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.test.ts', '!src/**/index.ts'],
  projects: [
    {
      testEnvironment: 'node',
      preset: 'ts-jest',
      coveragePathIgnorePatterns: ['/node_modules/', '/test/'],
      displayName: 'unit',
      testMatch: ['<rootDir>/**/*.test.ts'],
      testPathIgnorePatterns: ['it.test.ts'],
    },
    {
      testEnvironment: 'node',
      preset: 'ts-jest',
      coveragePathIgnorePatterns: ['/node_modules/', '/test/'],
      displayName: 'integration',
      testMatch: ['<rootDir>/**/*.it.test.ts'],
      setupFilesAfterEnv: ['<rootDir>/test/setupIntegrationTest.ts'],
      setupFiles: ['<rootDir>/test/setupEngines.ts'],
    },
  ],
};

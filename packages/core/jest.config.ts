module.exports = {
  collectCoverage: false,
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: [['lcov', { projectRoot: '../..' }]],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.test.ts'],
  projects: [
    {
      testEnvironment: 'node',
      preset: 'ts-jest',
      coveragePathIgnorePatterns: ['/node_modules/', '/test/'],
      displayName: 'unit',
      testMatch: ['<rootDir>/**/*.test.ts'],
      testPathIgnorePatterns: ['it.test.ts'],
    },
  ],
};
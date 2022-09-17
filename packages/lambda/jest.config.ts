module.exports = {
  collectCoverage: false,
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: [['lcov', { projectRoot: '../..' }]],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.spec.ts'],
  projects: [
    {
      testEnvironment: 'node',
      preset: 'ts-jest',
      coveragePathIgnorePatterns: ['/node_modules/', '/test/'],
      displayName: 'unit',
      testMatch: ['<rootDir>/**/*.spec.ts'],
      testPathIgnorePatterns: ['it.spec.ts'],
      //setupFiles: ['<rootDir>/test/setupUnit.ts'],
    },
  ],
};

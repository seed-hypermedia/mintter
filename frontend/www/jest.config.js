module.exports = {
  collectCoverageFrom: ['+(components|shared|screens)/**/*.+(js|jsx|ts|tsx)'],
  testEnvironment: 'jest-environment-jsdom',
  testPathIgnorePatterns: ['/node_modules/', '/.next/', '/out/', '/pages/'],
  moduleDirectories: ['node_modules', '.'],
  moduleFileExtensions: ['ts', 'tsx', 'js'],
  testMatch: ['**/__tests__/*.(ts|tsx)'],
  moduleNameMapper: {
    '\\.css$': require.resolve('./test/style-mock.js'),
    '^.+\\.module\\.(css|sass|scss)$': 'identity-obj-proxy',
  },
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  setupFilesAfterEnv: [
    '@testing-library/jest-dom/extend-expect',
    'jest-axe/extend-expect',
    './test/get-selection-mock',
  ],
  snapshotSerializers: ['jest-emotion'],
  globals: {
    'ts-jest': {
      tsConfig: 'tsconfig.jest.json',
    },
  },
  // coverageThreshold: {
  //   statements: 20,
  //   branches: 30,
  //   functions: 20,
  //   lines: 20,
  // },
  // transform: {
  //   '^.+\\.(js|jsx|ts|tsx)$': '<rootDir>/node_modules/babel-jest',
  //   '^.+\\.css$': '<rootDir>/config/jest/cssTransform.js',
  // },
}

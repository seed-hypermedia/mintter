const fs = require('fs')

module.exports = {
  roots: ['<rootDir>'],
  modulePaths: ['<rootDir>'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
  testPathIgnorePatterns: [
    '<rootDir>[/\\\\](node_modules|.next|out|pages)[/\\\\]',
  ],
  transformIgnorePatterns: ['[/\\\\]node_modules[/\\\\].+\\.(ts|tsx)$'],
  transform: {
    '^.+\\.(ts|tsx|js)$': 'babel-jest',
  },
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname',
  ],
  moduleNameMapper: {
    '\\.(css|less|sass|scss)$': 'identity-obj-proxy',
    '\\.(gif|ttf|eot|svg|png)$': '<rootDir>/test/file-mock.js',
  },
  collectCoverageFrom: ['+(components|shared|screens)/**/*.+(js|jsx|ts|tsx)'],

  snapshotSerializers: ['jest-emotion'],
  testEnvironment: 'jest-environment-jsdom',
  setupFilesAfterEnv: fs.existsSync('test/setupTests.js')
    ? ['<rootDir>/test/setupTests.js']
    : [],
}

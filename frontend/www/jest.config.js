module.exports = {
  testEnvironment: 'jest-environment-jsdom',
  testPathIgnorePatterns: ['/node_modules/', '/.next/'],
  moduleNameMapper: {
    '\\.css$': require.resolve('./test/style-mock.js'),
    '^.+\\.module\\.(css|sass|scss)$': 'identity-obj-proxy',
  },
  snapshotSerializers: ['jest-emotion'],
}

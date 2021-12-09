/** @type {import('@jest/types').Config.InitialOptions} */
module.exports = {
  preset: 'vite-jest',
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '\\.(css|sass|scss)$': 'identity-obj-proxy',
  },
}

// const path = require('path');

/** @type {import("snowpack").SnowpackUserConfig } */
module.exports = {
  // TODO: fix hot-reloading of workspace dependencies.
  workspaceRoot: false,
  mount: {
    public: { url: '/', static: true },
    src: { url: '/dist' },
    fonts: { url: '/fonts', static: true },
  },
  plugins: [
    '@snowpack/plugin-react-refresh',
    '@snowpack/plugin-dotenv',
    [
      '@snowpack/plugin-typescript',
      {
        /* Yarn PnP workaround: see https://www.npmjs.com/package/@snowpack/plugin-typescript */
        ...(process.versions.pnp ? { tsc: 'yarn pnpify tsc' } : {}),
      },
    ],
    '@snowpack/plugin-postcss',
    [
      '@snowpack/plugin-webpack',
      {
        extendConfig: (config) => {
          console.log({ config });
          return config;
        },
      },
    ],
  ],
  routes: [
    /* Enable an SPA Fallback in development: */
    { match: 'routes', src: '.*', dest: '/index.html' },
  ],
  optimize: {
    /* Example: Bundle your final build: */
  },
  packageOptions: {
    /* ... */
  },
  devOptions: {
    /* ... */
  },
  buildOptions: {
    /* ... */
    jsxInject: "import React from 'react'",
  },
  alias: {
    '@components': './src/components',
    '@pages': './src/pages',
    '@utils': './src/utils',
    '@mintter/ui-legacy': './src/lib',
    '@mintter/editor': './src/editor',
    '@mintter/client': './src/mintter-client',
    '@mintter/hooks': './src/mintter-hooks',
    test: './src/test',
  },
};

const path = require('path');
const isTest = process.env.NODE_ENV === 'test';
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
        // ...(process.versions.pnp ? { tsc: 'yarn pnpify tsc' } : {}),
        args: '--project ./tsconfig.build.json',
      },
    ],
    '@snowpack/plugin-postcss',
    // [
    //   '@snowpack/plugin-webpack',
    //   {
    //     sourceMap: true,
    //     htmlMinifierOptions: false,
    //     extendConfig: (config) => {
    //       // config.plugins.push(/* ... */);
    //       JSON.stringify(config, null, 2);
    //       return config;
    //     },
    //   },
    // ],
  ],
  routes: [
    /* Enable an SPA Fallback in development: */
    { match: 'routes', src: '.*', dest: '/index.html' },
  ],
  optimize: {
    bundle: false,
    minify: false,
    target: 'es2020',
  },
  packageOptions: {
    /* ... */
  },
  devOptions: {
    /* ... */
  },
  buildOptions: {
    /* ... */
    // jsxInject: "import React from 'react'",
  },
  alias: {
    '@components': './src/components',
    '@pages': './src/pages',
    '@utils': './src/utils',
    '@mintter/ui-legacy': './src/lib',
    '@mintter/editor': './src/editor',
    '@mintter/client': isTest
      ? './src/mocks/mintter-client'
      : './src/mintter-client',
    '@mintter/hooks': './src/mintter-hooks',
    test: './src/test',
  },
};

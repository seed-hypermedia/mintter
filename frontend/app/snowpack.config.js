const path = require('path');

/** @type {import("snowpack").SnowpackUserConfig } */
module.exports = {
  workspaceRoot: path.join(__dirname, '..', '..'),
  mount: {
    public: { url: '/', static: true },
    src: { url: '/dist' },
    fonts: { url: '/fonts', static: true },
  },
  plugins: [
    '@snowpack/plugin-react-refresh',
    '@snowpack/plugin-dotenv',
    '@snowpack/plugin-typescript',
    '@snowpack/plugin-postcss',
  ],
  routes: [
    /* Enable an SPA Fallback in development: */
    { match: 'routes', src: '.*', dest: '/index.html' },
  ],
  optimize: {
    /* Example: Bundle your final build: */
    // "bundle": true,
  },
  packageOptions: {
    /* ... */
  },
  devOptions: {
    /* ... */
  },
  buildOptions: {
    /* ... */
  },

  alias: {
    '@mintter/ui-legacy': './src/lib',
    '@mintter/editor': './src/editor',
    test: './test',
  },
};

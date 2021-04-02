// NODE_ENV=test - Needed by "@snowpack/web-test-runner-plugin"
process.env.NODE_ENV = 'test';

module.exports = {
  coverageConfig: {
    exclude: ['**/*/_snowpack/**/*'],
  },
  plugins: [require('@snowpack/web-test-runner-plugin')()],
  nodeResolve: true,
  testRunnerHtml: (testFramework) => `<html>
    <body>
      <script>
        global = globalThis;
      </script>
      <script>window.process = { env: { NODE_ENV: "development" } }</script>
      <script src="https://unpkg.com/react@17/umd/react.development.js" crossorigin></script>
  <script src="https://unpkg.com/react-dom@17/umd/react-dom.development.js" crossorigin></script>
      <script type="module" src="${testFramework}"></script>
    </body>
  </html>`,
};

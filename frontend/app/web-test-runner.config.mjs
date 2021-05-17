// NODE_ENV=test - Needed by "@snowpack/web-test-runner-plugin"
process.env.NODE_ENV = 'test';
import snowpackPlugin from '@snowpack/web-test-runner-plugin';
import { importMapsPlugin } from '@web/dev-server-import-maps';
import { esbuildPlugin } from '@web/dev-server-esbuild';

export default {
  coverageConfig: {
    exclude: ['**/*/_snowpack/**/*'],
  },
  plugins: [
    snowpackPlugin(),
    esbuildPlugin({
      tsx: true,
      ts: true,
      jsxFactory: 'React.createElement',
      jsxFragment: 'Fragment',
    }),
    importMapsPlugin({
      inject: {
        importMap: {
          imports: {
            // mock a dependency
            // 'package-a': '/mocks/package-a.js',
            // mock a module in your own code
            '@mintter/client': './src/mocks/mintter-client'
          },
        },
      },
    }),
  ],
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


// import { esbuildPlugin } from "@web/dev-server-esbuild";

// export default {
//   nodeResolve: true,
//   plugins: [
//     snowpackPlugin(),
//     esbuildPlugin({ tsx: true, jsxFactory: "React.createElement", jsxFragment: "Fragment" }),
//   ],
// };
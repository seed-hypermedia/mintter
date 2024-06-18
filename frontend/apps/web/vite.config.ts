import {vitePlugin as remix} from "@remix-run/dev";
import {defineConfig} from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
const extensions = [
  ".web.tsx",
  ".tsx",
  ".web.ts",
  ".ts",
  ".web.jsx",
  ".jsx",
  ".web.js",
  ".js",
  ".css",
  ".json",
  ".mjs",
];
export default defineConfig({
  resolve: {
    // Some libs that can run in both Web and Node.js, such as `axios`, we need to tell Vite to build them in Node.js.
    // browserField: false,
    mainFields: ["module", "jsnext:main", "jsnext"],
    extensions,
  },
  plugins: [
    remix({
      future: {
        v3_fetcherPersist: true,
        v3_relativeSplatPath: true,
        v3_throwAbortReason: true,
      },
    }),
    tsconfigPaths(),
    // {
    //   name: "log-files",
    //   transform(code, id) {
    //     console.log("Processing file:", id);
    //     return code;
    //   },
    // },
  ],
  optimizeDeps: {
    esbuildOptions: {
      resolveExtensions: extensions,
    },
  },
  build: {
    target: "esnext",
  },
});

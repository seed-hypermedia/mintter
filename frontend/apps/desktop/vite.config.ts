import {tamaguiExtractPlugin, tamaguiPlugin} from '@tamagui/vite-plugin'
import react from '@vitejs/plugin-react'
import {defineConfig, searchForWorkspaceRoot} from 'vite'
import {writeFileSync} from 'fs'
import path from 'path'
import tsconfigPaths from 'vite-tsconfig-paths'
import packageJson from './package.json'

const shouldExtract = process.env.EXTRACT === '1'
let isTest = process.env.NODE_ENV == 'test'

if (shouldExtract) {
  console.log('Tamagui compiler enabled')
}

writeFileSync(
  path.resolve(__dirname, './src/styles/_env.scss'),
  `$TAURI_PLATFORM: '${process.env.TAURI_PLATFORM}';
$TAURI_ARCH: '${process.env.TAURI_ARCH}';
$TAURI_FAMILY: '${process.env.TAURI_FAMILY}';
$TAURI_PLATFORM_VERSION: '${process.env.TAURI_PLATFORM_VERSION}';
$TAURI_PLATFORM_TYPE: '${process.env.TAURI_PLATFORM_TYPE}';
$TAURI_DEBUG: '${process.env.TAURI_DEBUG}';
`,
)

if (shouldExtract) {
  console.log(`Compiler enabled`)
}

const tamaguiConfig = {
  components: ['@mintter/ui', 'tamagui'],
  config: './tamagui.config.ts',
  useReactNativeWebLite: true,
}

export default defineConfig((conf) => ({
  cacheDir: '.vite',
  // prevent vite from obscuring rust errors
  clearScreen: false,
  // tauri expects a fixed port, fail if that port is not available
  server: {
    strictPort: true,
    fs: {
      allow: [searchForWorkspaceRoot(process.cwd())],
      /**
       * we need to allow from the workspace root because we depend on other packages in this workspace, and pnpm does not pull files from the colocated node_modules but from the root.
       *
       * reference: https://vitejs.dev/config/server-options.html#server-fs-allow
       */
    },
  },
  // to make use of `TAURI_PLATFORM`, `TAURI_ARCH`, `TAURI_FAMILY`, `TAURI_PLATFORM_VERSION`, `TAURI_PLATFORM_TYPE` and `TAURI_DEBUG` env variables
  envPrefix: ['VITE_', 'TAURI_'],
  build: {
    // tauri supports es2021
    target: ['es2021', 'chrome97', 'safari13'],
    // don't minify for debug builds
    minify: !process.env.TAURI_DEBUG ? 'esbuild' : undefined,
    // produce sourcemaps for debug builds
    sourcemap: !!process.env.TAURI_DEBUG,
  },
  define: {
    'import.meta.env.PACKAGE_VERSION': JSON.stringify(packageJson.version),
  },
  plugins: [
    tsconfigPaths(),
    react({
      fastRefresh: !isTest,
      jsxRuntime: isTest ? 'classic' : 'automatic',
    }),
    tamaguiPlugin(tamaguiConfig),
    shouldExtract ? tamaguiExtractPlugin(tamaguiConfig) : null,
  ].filter(Boolean),
  resolve: {
    alias: conf.command === 'build' ? {} : {},
  },
  // @ts-ignore
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    global: true,
  },
}))

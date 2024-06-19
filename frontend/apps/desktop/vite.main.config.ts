import {sentryVitePlugin} from '@sentry/vite-plugin'
import {tamaguiPlugin} from '@tamagui/vite-plugin'
import {defineConfig} from 'vite'
import tsConfigPaths from 'vite-tsconfig-paths'

const _tamaguiPlugin = tamaguiPlugin({
  components: ['@shm/ui', 'tamagui'],
  config: './tamagui.config.ts',
  themeBuilder: {
    input: '../../packages/ui/src/themes/theme.ts',
    output: '../../packages/ui/src/themes-generated.ts',
  },
})

const extensions = [
  '.web.tsx',
  '.tsx',
  '.web.ts',
  '.ts',
  '.web.jsx',
  '.jsx',
  '.web.js',
  '.js',
  '.css',
  '.json',
  '.mjs',
]

// https://vitejs.dev/config
export default defineConfig(({command, mode}) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  return {
    define: {
      __SENTRY_DSN__: JSON.stringify(process.env.VITE_DESKTOP_SENTRY_DSN),
    },
    build: {
      sourcemap: true,
      rollupOptions: {
        /**
         * Ignore "use client" waning since we are not using SSR
         * @see {@link https://github.com/TanStack/query/pull/5161#issuecomment-1477389761 Preserve 'use client' directives TanStack/query#5161}
         */
        onwarn(warning, warn) {
          if (
            warning.code === 'MODULE_LEVEL_DIRECTIVE' &&
            warning.message.includes(`"use client"`)
          ) {
            return
          }
          warn(warning)
        },
      },
    },
    resolve: {
      // Some libs that can run in both Web and Node.js, such as `axios`, we need to tell Vite to build them in Node.js.
      browserField: false,
      mainFields: ['module', 'jsnext:main', 'jsnext'],
      extensions,
    },
    plugins:
      command == 'build'
        ? [
            tsConfigPaths(),
            sentryVitePlugin({
              authToken: process.env.SENTRY_AUTH_TOKEN,
              org: 'mintter',
              project: 'electron',
              telemetry: false,
            }),
            _tamaguiPlugin,
          ]
        : [
            tsConfigPaths(),
            _tamaguiPlugin,
            // {
            //   name: 'log-files',
            //   transform(code, id) {
            //     console.log('Processing file:', id)
            //     return code
            //   },
            // },
          ],
    alias: {
      'react-native': 'react-native-web',
    },
    optimizeDeps: {
      esbuildOptions: {
        resolveExtensions: extensions,
      },
    },
  }
})

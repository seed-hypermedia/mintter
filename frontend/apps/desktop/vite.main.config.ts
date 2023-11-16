import {sentryVitePlugin} from '@sentry/vite-plugin'
import {tamaguiPlugin} from '@tamagui/vite-plugin'
import {defineConfig, loadEnv} from 'vite'
import tsConfigPaths from 'vite-tsconfig-paths'

const _tamaguiPlugin = tamaguiPlugin({
  components: ['@mintter/ui', 'tamagui'],
  config: './tamagui.config.ts',
  themeBuilder: {
    input: '../../packages/ui/src/themes/theme.ts',
    output: '../../packages/ui/src/themes-generated.ts',
  },
})

// https://vitejs.dev/config
export default defineConfig(({command, mode}) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '')
  return {
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
        : [tsConfigPaths(), _tamaguiPlugin],
  }
})

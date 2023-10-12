import {defineConfig, loadEnv} from 'vite'
import react from '@vitejs/plugin-react'
import {sentryVitePlugin} from '@sentry/vite-plugin'
import {tamaguiPlugin} from '@tamagui/vite-plugin'
import tsConfigPaths from 'vite-tsconfig-paths'
import {TamaguiConfig} from 'tamagui'

// https://vitejs.dev/config
export default defineConfig(({command, mode}) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '')
  const config = {
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
    plugins: [
      tsConfigPaths(),
      react(),
      tamaguiPlugin({
        components: ['@mintter/ui', 'tamagui'],
        config: './tamagui.config.ts',
        useReactNativeWebLite: true,
        themeBuilder: {
          input: '../../packages/ui/src/themes/theme.ts',
          output: '../../packages/ui/src/generated-themes.ts',
        },
      }),
    ],
  }

  if (command == 'build') {
    config.plugins.push(
      sentryVitePlugin({
        authToken: process.env.MINTTER_SENTRY_AUTH_TOKEN,
        org: 'mintter',
        project: 'electron',
        telemetry: false,
      }),
    )
  }

  return config
})

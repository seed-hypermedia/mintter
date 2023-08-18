import {defineConfig, loadEnv} from 'vite'
import react from '@vitejs/plugin-react'
import {sentryVitePlugin} from '@sentry/vite-plugin'
import {tamaguiPlugin} from '@tamagui/vite-plugin'
import tsConfigPaths from 'vite-tsconfig-paths'

const tamaguiConfig = {
  components: ['@mintter/ui', 'tamagui'],
  config: './tamagui.config.ts',
  useReactNativeWebLite: false,
}

// https://vitejs.dev/config
export default defineConfig(({command, mode}) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '')
  const config = {
    build: {
      sourcemap: true,
      rollupOptions: {
        external: ['@trpc/client'],
      },
    },
    plugins: [tsConfigPaths(), react(), tamaguiPlugin(tamaguiConfig)],
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

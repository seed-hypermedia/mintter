import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'
import {sentryVitePlugin} from '@sentry/vite-plugin'
import {tamaguiExtractPlugin, tamaguiPlugin} from '@tamagui/vite-plugin'

const tamaguiConfig = {
  components: ['@mintter/ui', 'tamagui'],
  config: './tamagui.config.ts',
  useReactNativeWebLite: false,
}

// https://vitejs.dev/config
export default defineConfig({
  build: {
    sourcemap: true,
  },
  plugins: [
    react(),
    sentryVitePlugin({
      authToken: process.env.MINTTER_SENTRY_AUTH_TOKEN,
      org: 'mintter',
      project: 'electron',
      telemetry: false,
    }),
    tamaguiPlugin(tamaguiConfig),
  ],
})

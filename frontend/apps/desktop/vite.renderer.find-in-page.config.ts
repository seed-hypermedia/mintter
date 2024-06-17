import {sentryVitePlugin} from '@sentry/vite-plugin'
import {tamaguiPlugin} from '@tamagui/vite-plugin'
import react from '@vitejs/plugin-react'
import {defineConfig} from 'vite'
import tsConfigPaths from 'vite-tsconfig-paths'

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
  const config = {
    build: {
      sourcemap: true,
      rollupOptions: {
        input: {
          app: './find.html',
        },
      },
    },
    plugins: [
      tsConfigPaths(),
      react(),
      tamaguiPlugin({
        components: ['@shm/ui', 'tamagui'],
        config: './tamagui.config.ts',
        themeBuilder: {
          input: '../../packages/ui/src/themes/theme.ts',
          output: '../../packages/ui/src/themes-generated.ts',
        },
      }),
    ],
    resolve: {
      extensions,
    },
    alias: {
      'react-native': 'react-native-web',
    },
    optimizeDeps: {
      esbuildOptions: {
        resolveExtensions: extensions,
      },
    },
  }

  if (command == 'build') {
    config.plugins.push(
      sentryVitePlugin({
        authToken: process.env.SENTRY_AUTH_TOKEN,
        org: 'mintter',
        project: 'electron',
        telemetry: false,
      }),
    )
  }

  return config
})

/** @type {import('next').NextConfig} */
const {withTamagui} = require('@tamagui/next-plugin')
const {join} = require('path')

process.env.IGNORE_TS_CONFIG_PATHS = 'true'
process.env.TAMAGUI_TARGET = 'web'
process.env.TAMAGUI_DISABLE_WARN_DYNAMIC_LOAD = '1'

const boolVals = {
  true: true,
  false: false,
}

const plugins = [
  withTamagui({
    config: './tamagui.config.ts',
    components: ['@mintter/ui', 'tamagui'],
    importsWhitelist: ['constants.js', 'colors.js'],
    logTimings: true,
    disableExtraction: process.env.NODE_ENV === 'development',
    shouldExtract: (path) => {
      if (path.includes('../packages/ui')) {
        return true
      }
    },
    // Advanced:

    // adds mini-css-extract and css-minimizer-plugin, can fix issues with unique configurations
    enableCSSOptimizations: false,
    // disable tamagui config to make fonts easier to import
    disableFontSupport: false,

    // experiment - reduced bundle size react-native-web
    useReactNativeWebLite: true,
    excludeReactNativeWebExports: [
      'Switch',
      'ProgressBar',
      'Picker',
      'CheckBox',
      'Touchable',
    ],
  }),
]

module.exports = function () {
  /** @type {import('next').NextConfig} */
  let config = {
    typescript: {
      ignoreBuildErrors: true,
    },
    modularizeImports: {
      '@tamagui/lucide-icons': {
        transform: `@tamagui/lucide-icons/dist/esm/icons/{{kebabCase member}}`,
        skipDefaultConversion: true,
      },
    },
    transpilePackages: [
      'react-native-web',
      'expo-linking',
      'expo-constants',
      'expo-modules-core',
    ],
    experimental: {
      // optimizeCss: true,
      scrollRestoration: true,
      legacyBrowsers: false,
      outputFileTracingRoot: join(__dirname, '../../../'),
    },
  }

  for (const plugin of plugins) {
    config = {
      ...config,
      ...plugin(config),
    }
  }

  if (!process.env.MINTTER_IS_GATEWAY) {
    config.output = 'standalone'
  }

  return config
}

/** @type {import('next').NextConfig} */
const {withTamagui} = require('@tamagui/next-plugin')
const {join} = require('path')
// const withBundleAnalyzer = require('@next/bundle-analyzer')

process.env.IGNORE_TS_CONFIG_PATHS = 'true'
process.env.TAMAGUI_TARGET = 'web'
// process.env.TAMAGUI_DISABLE_WARN_DYNAMIC_LOAD = '1'

const boolVals = {
  true: true,
  false: false,
}

const disableExtraction =
  boolVals[process.env.DISABLE_EXTRACTION] ??
  process.env.NODE_ENV == 'development'

if (disableExtraction) {
  console.log(
    'NEXT: Disabling static extraction in development mode for better HMR',
  )
}

let transpilePackages = [
  'react-native-web',
  // 'expo-linking',
  // 'expo-constants',
  // 'expo-modules-core',
  '@mintter/ui',
]

const plugins = [
  // withBundleAnalyzer({
  //   enabled: process.env.NODE_ENV === 'production',
  //   openAnalyzer: process.env.ANALYZE === 'true',
  // }),
  withTamagui({
    config: './tamagui.config.ts',
    components: ['@mintter/ui', 'tamagui'],
    importsWhitelist: ['constants.js', 'colors.js'],
    logTimings: true,
    disableExtraction,
    // This is important if you have a shared package like in the create-tamagui template to ignore components for other distributions (like components for the app not be compiled here)
    // shouldExtract: (path) => {
    //   if (path.includes(join('packages', 'app'))) {
    //     return true
    //   }
    // },
    // Advanced:

    // adds mini-css-extract and css-minimizer-plugin, can fix issues with unique configurations
    // enableCSSOptimizations: false,
    // disable tamagui config to make fonts easier to import
    // disableFontSupport: false,

    // experiment - reduced bundle size react-native-web
    useReactNativeWebLite: false, // if enabled dont need excludeReactNativeWebExports
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
    transpilePackages,
    modularizeImports: {
      '@tamagui/lucide-icons': {
        transform: `@tamagui/lucide-icons/dist/esm/icons/{{kebabCase member}}`,
        skipDefaultConversion: true,
      },
    },
    experimental: {
      // optimizeCss: true,
      esmExternals: true,
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

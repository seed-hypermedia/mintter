const apiUrl = process.env.MINTTER_API_URL || 'http://localhost:55001'

const isProd = process.env.NODE_ENV == 'production'

const config = {
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
  // We use a separate dist dir for production. Otherwise they get mixed up
  // when switching between yarn dev and yarn build often.
  distDir: isProd ? '.next.prod' : '.next',

  // Will be available on both server and client
  publicRuntimeConfig: {
    MINTTER_API_URL: apiUrl,
  },
  async rewrites() {
    return [
      {
        source: '/:any*',
        destination: '/',
      },
    ]
  },
}

// For production we want to specify a stable build ID so that build is reproducible and identifiable.
const buildId = process.env.NEXT_BUILD_ID
if (buildId) {
  config.generateBuildId = async () => {
    return buildId
  }
}

module.exports = config

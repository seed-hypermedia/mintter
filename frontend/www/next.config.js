const apiUrl = process.env.MINTTER_API_URL || 'http://localhost:55001'

module.exports = {
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

const port = process.env.MINTTER_PORT || `55001`
const hostname = process.env.MINTTER_HOSTNAME || `http://localhost`

module.exports = {
  /* config options here */
  publicRuntimeConfig: {
    // Will be available on both server and client
    MINTTER_HOSTNAME: hostname,
    MINTTER_PORT: port,
  },
}

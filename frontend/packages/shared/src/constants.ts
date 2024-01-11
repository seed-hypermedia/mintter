/// <reference types="vite/client" />

// we are using this ternary ugly thing with `import.meta.env?` and `process.env` because this variables will be loaded in different runtimes, and not in all runtines both "ways" are available.
export const HTTP_PORT =
  (import.meta.env && import.meta.env.VITE_DESKTOP_HTTP_PORT) ||
  process.env.VITE_DESKTOP_HTTP_PORT

export const GRPC_PORT =
  (import.meta.env && import.meta.env.VITE_DESKTOP_GRPC_PORT) ||
  process.env.VITE_DESKTOP_GRPC_PORT

export const P2P_PORT =
  (import.meta.env && import.meta.env.VITE_DESKTOP_P2P_PORT) ||
  process.env.VITE_DESKTOP_P2P_PORT

export const HOSTNAME =
  (import.meta.env && import.meta.env.VITE_DESKTOP_HOSTNAME) ||
  process.env.VITE_DESKTOP_HOSTNAME

export const VERSION =
  (import.meta.env && import.meta.env.VITE_VERSION) ||
  process.env.VITE_VERSION ||
  '0.0.0'

export const API_HTTP_URL = `${HOSTNAME}:${HTTP_PORT}`
export const API_FILE_UPLOAD_URL = `${HOSTNAME}:${HTTP_PORT}/ipfs/file-upload`
export const API_FILE_URL = `${HOSTNAME}:${HTTP_PORT}/ipfs`
export const API_GRAPHQL_ENDPOINT = `${HOSTNAME}:${HTTP_PORT}/graphql`

// this is injected by Vite, so it indicates if we are in the production build of the DESKTOP app
export const IS_PROD_DESKTOP = !!import.meta.env?.PROD

export const LIGHTNING_API_URL = IS_PROD_DESKTOP
  ? 'https://ln.mintter.com'
  : 'https://ln.testnet.mintter.com'

export const HM_SENTRY_DESKTOP_DSN =
  (import.meta.env && import.meta.env.VITE_HM_SENTRY_DESKTOP_DSN) ||
  process.env.VITE_HM_SENTRY_DESKTOP_DSN ||
  'https://8d3089ffb71045dc911bc66efbd3463a@o4504088793841664.ingest.sentry.io/4505527460429824'

/**
 * /// <reference types="vite/client" />

// we are using this ternary ugly thing with `import.meta.env?` and `process.env` because this variables will be loaded in different runtimes, and not in all runtines both "ways" are available.

export const VERSION =
  (import.meta.env && import.meta.env.VITE_VERSION) ||
  process.env.VITE_VERSION ||
  '0.0.0'

export const API_HTTP_URL = `${import.meta.env.VITE_HOSTNAME}:${
  import.meta.env.VITE_HTTP_PORT
}`

export const API_FILE_UPLOAD_URL = `${import.meta.env.VITE_HOSTNAME}:${
  import.meta.env.VITE_HTTP_PORT
}/ipfs/file-upload`
export const API_FILE_URL = `${import.meta.env.VITE_HOSTNAME}:${
  import.meta.env.VITE_HTTP_PORT
}/ipfs`
export const API_GRAPHQL_ENDPOINT = `${import.meta.env.VITE_HOSTNAME}:${
  import.meta.env.VITE_HTTP_PORT
}/graphql`

// this is injected by Vite, so it indicates if we are in the production build of the DESKTOP app
export const IS_PROD_DESKTOP = !!import.meta.env?.PROD

export const LIGHTNING_API_URL = IS_PROD_DESKTOP
  ? 'https://ln.mintter.com'
  : 'https://ln.testnet.mintter.com'

export const HM_SENTRY_DESKTOP_DSN = import.meta.env
  ?.VITE_MINTTER_SENTRY_DESKTOP

 */

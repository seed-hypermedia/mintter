/// <reference types="vite/client" />

// we are using this ternary ugly thing with `import.meta.env?` and `process.env` because this variables will be loaded in different runtimes, and not in all runtines both "ways" are available.

// this is injected by Vite, so it indicates if we are in the production build of the DESKTOP app
export const IS_PROD_DESKTOP = !!import.meta.env?.PROD
export const IS_DEV_DESKTOP = !!import.meta.env?.DEV

export const P2P_PORT =
  (import.meta.env && import.meta.env.VITE_DESKTOP_P2P_PORT) ||
  process.env.VITE_DESKTOP_P2P_PORT ||
  55000
export const HTTP_PORT =
  (import.meta.env && import.meta.env.VITE_DESKTOP_HTTP_PORT) ||
  process.env.VITE_DESKTOP_HTTP_PORT ||
  55001
export const GRPC_PORT =
  (import.meta.env && import.meta.env.VITE_DESKTOP_GRPC_PORT) ||
  process.env.VITE_DESKTOP_GRPC_PORT ||
  55002

export const ELECTRON_HTTP_PORT =
  (import.meta.env && import.meta.env.VITE_ELECTRON_HTTP_PORT) ||
  process.env.VITE_ELECTRON_HTTP_PORT ||
  55003

export const HOSTNAME =
  (import.meta.env && import.meta.env.VITE_DESKTOP_HOSTNAME) ||
  process.env.VITE_DESKTOP_HOSTNAME
export const DESKTOP_APPDATA =
  (import.meta.env && import.meta.env.VITE_DESKTOP_APPDATA) ||
  process.env.VITE_DESKTOP_APPDATA ||
  'Seed'

export const VERSION =
  (import.meta.env && import.meta.env.VITE_VERSION) ||
  process.env.VITE_VERSION ||
  '0.0.0'

export const API_HTTP_URL = `${HOSTNAME}:${HTTP_PORT}`
export const API_GRPC_URL = `${HOSTNAME}:${GRPC_PORT}`
export const API_FILE_UPLOAD_URL = `${HOSTNAME}:${HTTP_PORT}/ipfs/file-upload`
export const API_FILE_URL = `${HOSTNAME}:${HTTP_PORT}/ipfs`
export const API_GRAPHQL_ENDPOINT = `${HOSTNAME}:${HTTP_PORT}/graphql`

export const LIGHTNING_API_URL = IS_PROD_DESKTOP
  ? 'https://ln.mintter.com'
  : 'https://ln.testnet.mintter.com'

export const VITE_DESKTOP_SENTRY_DSN =
  (import.meta.env && import.meta.env.VITE_DESKTOP_SENTRY_DSN) ||
  process.env.VITE_DESKTOP_SENTRY_DSN

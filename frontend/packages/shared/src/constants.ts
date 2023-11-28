/// <reference types="vite/client" />

// we are using this ternary ugly thing with `import.meta.env?` and `process.env` because this variables will be loaded in different runtimes, and not in all runtines both "ways" are available.

export const MINTTER_GATEWAY_URL =
  (import.meta.env && import.meta.env.VITE_MINTTER_GATEWAY_URL) ||
  process.env.VITE_MINTTER_GATEWAY_URL ||
  'https://mintter.com/'
export const BACKEND_HTTP_PORT =
  (import.meta.env && import.meta.env.VITE_BACKEND_HTTP_PORT) ||
  process.env.VITE_BACKEND_HTTP_PORT ||
  '55001'

export const BACKEND_GRPC_PORT =
  (import.meta.env && import.meta.env.VITE_BACKEND_GRPC_PORT) ||
  process.env.VITE_BACKEND_GRPC_PORT ||
  '56001'

export const BACKEND_P2P_PORT =
  (import.meta.env && import.meta.env.VITE_BACKEND_P2P_PORT) ||
  process.env.VITE_BACKEND_P2P_PORT ||
  '56002'

export const BACKEND_HOSTNAME =
  (import.meta.env && import.meta.env.VITE_BACKEND_HOSTNAME) ||
  process.env.VITE_BACKEND_HOSTNAME ||
  'http://localhost'

export const APP_VERSION =
  (import.meta.env && import.meta.env.VITE_APP_VERSION) ||
  process.env.VITE_APP_VERSION ||
  '0.0.0'

export const BACKEND_HTTP_URL = `${BACKEND_HOSTNAME}:${BACKEND_HTTP_PORT}`
export const BACKEND_GRPC_URL = `${BACKEND_HOSTNAME}:${BACKEND_GRPC_PORT}`
export const BACKEND_P2P_URL = `${BACKEND_HOSTNAME}:${BACKEND_P2P_PORT}`
export const BACKEND_FILE_UPLOAD_URL = `${BACKEND_HOSTNAME}:${BACKEND_HTTP_PORT}/ipfs/file-upload`
export const BACKEND_FILE_URL = `${BACKEND_HOSTNAME}:${BACKEND_HTTP_PORT}/ipfs`
export const BACKEND_GRAPHQL_ENDPOINT = `${BACKEND_HOSTNAME}:${BACKEND_HTTP_PORT}/graphql`

// this is injected by Vite, so it indicates if we are in the production build of the DESKTOP app
export const IS_PROD_DESKTOP = !!import.meta.env?.PROD

export const LIGHTNING_SERVER_URL = IS_PROD_DESKTOP
  ? 'https://ln.mintter.com'
  : 'https://ln.testnet.mintter.com'

export const MINTTER_SENTRY_DESKTOP_DSN = import.meta.env
  ?.VITE_MINTTER_SENTRY_DESKTOP

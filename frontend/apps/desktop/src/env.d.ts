/// <reference types="vite/client" />

declare const __SENTRY_DSN__: string

interface ImportMetaEnv {
  readonly VITE_DESKTOP_HTTP_PORT: string
  readonly VITE_DESKTOP_P2P_PORT: string
  readonly VITE_DESKTOP_GRPC_PORT: string
  readonly VITE_DESKTOP_APPDATA: string
  readonly VITE_DESKTOP_HOSTNAME: string
  readonly VITE_VERSION: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

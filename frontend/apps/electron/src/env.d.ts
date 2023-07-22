/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MINTTER_SENTRY_DESKTOP: string
  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string
declare const MAIN_WINDOW_VITE_NAME: string

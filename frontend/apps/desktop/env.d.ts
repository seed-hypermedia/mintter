/// <reference types="vite/client" />

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string
declare const MAIN_WINDOW_VITE_NAME: string
declare const FIND_IN_PAGE_VITE_DEV_SERVER_URL: string
declare const FIND_IN_PAGE_VITE_NAME: string

interface ImportMetaEnv {
  readonly VITE_HTTP_PORT: string
  readonly VITE_GRPC_PORT: string
  readonly VITE_P2P_PORT: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

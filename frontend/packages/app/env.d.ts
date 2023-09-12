interface ImportMetaEnv {
  readonly VITE_MINTTER_GATEWAY_URL: string
  readonly VITE_BACKEND_HTTP_PORT: string
  readonly VITE_BACKEND_GRPC_PORT: string
  readonly VITE_BACKEND_P2P_PORT: string
  readonly VITE_BACKEND_HOSTNAME: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface ImportMetaEnv {
  readonly VITE_HTTP_PORT: string
  readonly VITE_GRPC_PORT: string
  readonly VITE_P2P_PORT: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

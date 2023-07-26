interface ImportMetaEnv {
  readonly MINTTER_GATEWAY_URL: string
  readonly BACKEND_HTTP_PORT: string
  readonly BACKEND_GRPC_PORT: string
  readonly BACKEND_P2P_PORT: string
  readonly BACKEND_HOSTNAME: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

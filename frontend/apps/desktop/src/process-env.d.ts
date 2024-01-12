declare global {
  namespace NodeJS {
    interface ProcessEnv {
      [key: string]: string | undefined
      VITE_DESKTOP_HTTP_PORT: string
      VITE_DESKTOP_P2P_PORT: string
      VITE_DESKTOP_GRPC_PORT: string
      VITE_DESKTOP_APPDATA: string
      VITE_DESKTOP_HOSTNAME: string
      VITE_VERSION: string
      // add more environment variables and their types here
    }
  }
}

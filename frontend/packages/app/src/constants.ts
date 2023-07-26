/// <reference types="vite/client" />

export const MINTTER_GATEWAY_URL =
  import.meta.env.MINTTER_GATEWAY_URL || 'https://mintter.com/'
export const BACKEND_HTTP_PORT = import.meta.env.BACKEND_HTTP_PORT || '55001'
export const BACKEND_GRPC_PORT = import.meta.env.BACKEND_GRPC_PORT || '56001'
export const BACKEND_P2P_PORT = import.meta.env.BACKEND_P2P_PORT || '56002'

export const BACKEND_HOSTNAME =
  import.meta.env.BACKEND_HOSTNAME || 'http://localhost'

export const BACKEND_HTTP_URL = `${BACKEND_HOSTNAME}:${BACKEND_HTTP_PORT}`
export const BACKEND_GRPC_URL = `${BACKEND_HOSTNAME}:${BACKEND_GRPC_PORT}`
export const BACKEND_P2P_URL = `${BACKEND_HOSTNAME}:${BACKEND_P2P_PORT}`
export const BACKEND_FILE_UPLOAD_URL = `${BACKEND_HOSTNAME}:${BACKEND_HTTP_PORT}/ipfs/file-upload`
export const BACKEND_FILE_URL = `${BACKEND_HOSTNAME}:${BACKEND_HTTP_PORT}/ipfs`
export const BACKEND_GRAPHQL_ENDPOINT = `${BACKEND_HOSTNAME}/graphql`

export const features = {
  comments: false,
}

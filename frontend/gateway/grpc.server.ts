import {createConnectTransport} from '@bufbuild/connect-node'

function getGRPCHost() {
  if (process.env.GW_GRPC_ENDPOINT) {
    return process.env.GW_GRPC_ENDPOINT
  }

  if (process.env.NODE_ENV == 'development') {
    return 'http://127.0.0.1:55001'
  }

  return 'https://gateway.mintter.com'
}

let grpcBaseURL = getGRPCHost()

console.log('🚀 grpc.server.ts ', {
  grpcBaseURL,
})

export const transport = createConnectTransport({
  httpVersion: '2',
  baseUrl: grpcBaseURL,
})

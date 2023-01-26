import {createGrpcWebTransport} from '@bufbuild/connect-web'

export const transport = createGrpcWebTransport({
  baseUrl: 'http://localhost:55001',
})

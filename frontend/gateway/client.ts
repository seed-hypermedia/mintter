import {createGrpcClient} from '@mintter/shared'

let host =
  process.env.NODE_ENV == 'development'
    ? 'http://localhost:55001'
    : 'https://gateway.mintter.com'

export const client = createGrpcClient({
  host,
})

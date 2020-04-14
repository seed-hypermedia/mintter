import {MintterPromiseClient} from '@mintter/proto/mintter_grpc_web_pb'

export const makeRpcClient = (): MintterPromiseClient => {
  return new MintterPromiseClient('http://localhost:55001')
}

export {MintterPromiseClient}

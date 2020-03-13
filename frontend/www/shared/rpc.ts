import {createContext, useContext} from 'react'
import {MintterPromiseClient} from '@mintter/proto/mintter_grpc_web_pb'

export const makeRpcClient = (): MintterPromiseClient => {
  return new MintterPromiseClient('http://localhost:55001')
}

export const RpcContext = createContext<MintterPromiseClient>(makeRpcClient())

export const RpcProvider = RpcContext.Provider

export function useRPC() {
  return useContext(RpcContext)
}

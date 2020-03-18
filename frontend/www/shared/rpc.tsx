import {createContext, useContext} from 'react'
import {MintterPromiseClient} from '@mintter/proto/mintter_grpc_web_pb'

export const makeRpcClient = (): MintterPromiseClient => {
  return new MintterPromiseClient('http://localhost:55001')
}

export const RpcContext = createContext<MintterPromiseClient>(makeRpcClient())

export function RpcProvider({
  children,
  value = makeRpcClient(),
}: {
  children: React.ReactNode
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value?: MintterPromiseClient | any
}) {
  return <RpcContext.Provider value={value}>{children}</RpcContext.Provider>
}

export function useRPC() {
  return useContext(RpcContext)
}

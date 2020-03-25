import {createContext, useContext} from 'react'
import {MintterPromiseClient} from '@mintter/proto/mintter_grpc_web_pb'

export const makeRpcClient = (): MintterPromiseClient => {
  return new MintterPromiseClient('http://localhost:55001')
}

const initialValue: MintterPromiseClient = makeRpcClient()

export const RpcContext = createContext<MintterPromiseClient>(initialValue)

export function RpcProvider({
  children,
  value = initialValue,
}: {
  children: React.ReactNode
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value?: MintterPromiseClient
}) {
  return <RpcContext.Provider value={value}>{children}</RpcContext.Provider>
}

export function useRPC() {
  return useContext(RpcContext)
}

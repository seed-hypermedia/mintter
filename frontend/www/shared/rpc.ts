import {createContext} from 'react'
import {AccountsPromiseClient} from '@mintter/proto/mintter_grpc_web_pb'

interface RpcContextInterface {
  accounts: AccountsPromiseClient
}

export const makeRpcClient = (): RpcContextInterface => {
  return {
    accounts: new AccountsPromiseClient('http://localhost:55001'),
  }
}

export const RpcContext = createContext<RpcContextInterface>(makeRpcClient())

export const RpcProvider = RpcContext.Provider

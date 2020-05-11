import {MintterPromiseClient} from '@mintter/proto/mintter_grpc_web_pb'
import {DocumentsPromiseClient} from '@mintter/proto/documents_grpc_web_pb'

const hostname = `http://localhost`
const port = `55001`

const path = `${hostname}:${port}`

export function makeRpcClient(): MintterPromiseClient {
  return new MintterPromiseClient(path)
}

export function makeRpcDocumentsClient(): DocumentsPromiseClient {
  return new DocumentsPromiseClient(path)
}

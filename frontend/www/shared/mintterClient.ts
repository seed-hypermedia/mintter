import {MintterPromiseClient} from '@mintter/proto/mintter_grpc_web_pb'
import {DocumentsPromiseClient} from '@mintter/proto/documents_grpc_web_pb'
import {
  ListPublicationsRequest,
  ListPublicationsResponse,
  Publication,
} from '@mintter/proto/documents_pb'
import {ConnectToPeerRequest} from '@mintter/proto/mintter_pb'

const hostname = `http://localhost`
const port = `55001`

const path = `${hostname}:${port}`

export const documentsClient = new DocumentsPromiseClient(path)
export const usersClient = new MintterPromiseClient(path)

// ============================

export async function allPublications(data): Promise<string> {
  console.log('all publications!', data)
  return Promise.resolve('all publications resolved')
}

export async function searchPublicationById(
  id,
  page = 0,
  // ): Promise<Publication | undefined> {
) {
  const req = new ListPublicationsRequest()
  req.setPageSize(page)

  const list = await documentsClient.listPublications(req)
  console.log(list.toObject())
}

export async function connectToPeerById(peerIds: string[]) {
  console.log('peerId => ', peerIds)
  const req = new ConnectToPeerRequest()
  req.setAddrsList(peerIds)
  const res = await usersClient.connectToPeer(req)
  console.log('peerId res => ', res)
  return res
}

export {MintterPromiseClient}

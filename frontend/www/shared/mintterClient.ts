import {MintterPromiseClient} from '@mintter/proto/mintter_grpc_web_pb'
import {DocumentsPromiseClient} from '@mintter/proto/documents_grpc_web_pb'
import {
  ListPublicationsRequest,
  ListPublicationsResponse,
  Publication,
  GetPublicationRequest,
  BatchGetSectionsRequest,
  CreateDraftRequest,
} from '@mintter/proto/documents_pb'
import {
  ConnectToPeerRequest,
  GetProfileRequest,
} from '@mintter/proto/mintter_pb'
import getConfig from 'next/config'

const {publicRuntimeConfig} = getConfig()
const hostname = publicRuntimeConfig.MINTTER_HOSTNAME
const port = publicRuntimeConfig.MINTTER_PORT
const path = `${hostname}:${port}`

export const documentsClient = new DocumentsPromiseClient(path)
export const usersClient = new MintterPromiseClient(path)

// ============================

export async function allPublications(page = 0) {
  const req = new ListPublicationsRequest()
  req.setPageSize(page)
  return await documentsClient.listPublications(req)
}

export async function getPublication(id): Promise<Publication | undefined> {
  const req = new GetPublicationRequest()
  req.setPublicationId(id)

  return await documentsClient.getPublication(req)
}

export async function getSections(sectionsList: any) {
  const req = new BatchGetSectionsRequest()
  req.setSectionIdsList(sectionsList)

  return await documentsClient.batchGetSections(req)
}

export async function createDraft() {
  const req = new CreateDraftRequest()
  return await documentsClient.createDraft(req)
}

export async function connectToPeerById(peerIds: string[]) {
  console.log('peerId => ', peerIds)
  const req = new ConnectToPeerRequest()
  req.setAddrsList(peerIds)
  return await usersClient.connectToPeer(req)
}

export async function getProfile() {
  // TODO: (horacio): add react query here?
  const req = new GetProfileRequest()
  return await usersClient.getProfile(req)
}

export async function getAuthor(authorId: string) {
  const {profile} = await (await getProfile()).toObject()
  return profile.accountId === authorId ? 'me' : authorId
}

export {MintterPromiseClient}

import getConfig from 'next/config'
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
  Profile,
  GetProfileResponse,
  UpdateProfileRequest,
  InitProfileRequest,
  InitProfileResponse,
} from '@mintter/proto/mintter_pb'
import {
  useQuery,
  QueryResult,
  usePaginatedQuery,
  PaginatedQueryResult,
  queryCache,
} from 'react-query'

const {publicRuntimeConfig} = getConfig()
const hostname = publicRuntimeConfig.MINTTER_HOSTNAME
const port = publicRuntimeConfig.MINTTER_PORT
const path = `${hostname}:${port}`

export const documentsClient = new DocumentsPromiseClient(path)
export const usersClient = new MintterPromiseClient(path)

// ============================

export function allPublications(
  page = 0,
): PaginatedQueryResult<ListPublicationsResponse> {
  return usePaginatedQuery(['AllPublications', page], async (key, page) => {
    const req = new ListPublicationsRequest()
    req.setPageSize(page)
    return await documentsClient.listPublications(req)
  })
}

export function getPublication(id: string): QueryResult<Publication> {
  return useQuery(['Publication', id], async (key, id) => {
    const req = new GetPublicationRequest()
    req.setPublicationId(id)

    return await documentsClient.getPublication(req)
  })
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

export async function createProfile({
  aezeedPassphrase,
  mnemonicList,
  walletPassword,
}: InitProfileRequest.AsObject) {
  const req = new InitProfileRequest()
  req.setAezeedPassphrase(aezeedPassphrase)
  req.setMnemonicList(mnemonicList)
  req.setWalletPassword(walletPassword)
  await usersClient.initProfile(req)
}

export function getProfile(): QueryResult<GetProfileResponse> {
  return useQuery('Profile', async () => {
    const req = new GetProfileRequest()
    return await usersClient.getProfile(req)
  })
}

export async function setProfile({
  username,
  email,
  bio,
}: {
  username: string
  email: string
  bio: string
}) {
  const profile = (await queryCache.getQueryData('Profile')) as Profile
  username.length > 1 && profile.setUsername(username)
  email.length > 1 && profile.setEmail(email)
  bio.length > 1 && profile.setBio(bio)
  const req = new UpdateProfileRequest()
  req.setProfile(profile)
  try {
    await usersClient.updateProfile(req)
  } catch (err) {
    console.error('setProfileError ===> ', err)
  }
}

export function getAuthor(authorId: string) {
  const profile = queryCache.getQueryData('Profile') as Profile

  let author
  if (profile.toObject) {
    let p = profile.toObject()

    author = p.accountId === authorId ? 'me' : `...${authorId.slice(-16)}`
  }

  return author
}

export {MintterPromiseClient}

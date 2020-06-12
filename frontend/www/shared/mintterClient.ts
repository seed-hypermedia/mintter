import getConfig from 'next/config'
import {Node} from 'slate'
import {MintterPromiseClient} from '@mintter/proto/mintter_grpc_web_pb'
import {DocumentsPromiseClient} from '@mintter/proto/documents_grpc_web_pb'
import {
  ListPublicationsRequest,
  ListPublicationsResponse,
  Publication,
  GetPublicationRequest,
  BatchGetSectionsRequest,
  CreateDraftRequest,
  ListDraftsResponse,
  ListDraftsRequest,
  Draft,
  GetDraftRequest,
  PublishDraftRequest,
  DeleteDraftRequest,
} from '@mintter/proto/documents_pb'
import {
  ConnectToPeerRequest,
  GetProfileRequest,
  Profile,
  GetProfileResponse,
  UpdateProfileRequest,
  InitProfileRequest,
  InitProfileResponse,
  GetProfileAddrsRequest,
} from '@mintter/proto/mintter_pb'
import {
  useQuery,
  QueryResult,
  usePaginatedQuery,
  PaginatedQueryResult,
  queryCache,
  QueryOptions,
} from 'react-query'
import {fromSlateToMarkdown} from './parseToMarkdown'
import {parseToMarkdown} from './parseToMarkdown'

const config = getConfig()
const hostname = config?.publicRuntimeConfig.MINTTER_HOSTNAME
const port = config?.publicRuntimeConfig.MINTTER_PORT
const path = `${hostname}:${port}`

export const documentsClient = new DocumentsPromiseClient(path)
export const usersClient = new MintterPromiseClient(path)

// ============================

// TODO: horacio: remove useQuery from api client layer

export async function allPublications(
  key,
  page = 0,
): Promise<ListPublicationsResponse> {
  const req = new ListPublicationsRequest()
  req.setPageSize(page)
  return await documentsClient.listPublications(req)
}

export function getPublication(id: string): QueryResult<Publication> {
  return useQuery(['Publication', id], async (key, id) => {
    const req = new GetPublicationRequest()
    req.setPublicationId(id)

    return await documentsClient.getPublication(req)
  })
}

export async function getSections(sectionsList: any) {
  // TODO: horacio: refactor
  const req = new BatchGetSectionsRequest()
  req.setSectionIdsList(sectionsList)

  return await documentsClient.batchGetSections(req)
}

export async function allDrafts(key, page = 0): Promise<ListDraftsResponse> {
  const req = new ListDraftsRequest()
  req.setPageSize(page)
  return await documentsClient.listDrafts(req)
}

export async function createDraft() {
  // TODO: horacio: refactor
  const req = new CreateDraftRequest()
  return await documentsClient.createDraft(req)
}

export function getDraft(
  id: string,
  options?: QueryOptions<Draft>,
): QueryResult<Draft> {
  return useQuery(
    id && ['Draft', id],
    async (key, id) => {
      const req = new GetDraftRequest()
      req.setDocumentId(id)
      return await documentsClient.getDraft(req)
    },
    {
      refetchOnWindowFocus: false,
      ...options,
    },
  )
}

export interface SetDraftRequest {
  documentId: string | string[]
  title: string
  description: string
  sections: any[]
}

export async function setDraft({
  documentId,
  title,
  description,
  sections,
}: SetDraftRequest) {
  const request = new Draft()

  if (Array.isArray(documentId)) {
    throw new Error(
      `Impossible render: You are trying to access the editor passing ${
        documentId.length
      } document IDs => ${documentId.map(q => q).join(', ')}`,
    )
  }

  request.setDocumentId(documentId)
  title && request.setTitle(title)
  description && request.setDescription(description)

  if (sections.length > 0) {
    const s = fromSlateToMarkdown(sections)

    request.setSectionsList(s)
  }
  return await documentsClient.saveDraft(request)
}

export async function deleteDraft(id: string) {
  const req = new DeleteDraftRequest()
  req.setDocumentId(id)

  return documentsClient.deleteDraft(req)
}

export async function publishDraft(draftId: string) {
  const req = new PublishDraftRequest()
  req.setDocumentId(draftId)
  return await documentsClient.publishDraft(req)
}

export async function connectToPeerById(peerIds: string[]) {
  // TODO: horacio: refactor
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
  return await usersClient.initProfile(req)
}

// export function getProfile(): QueryResult<GetProfileResponse> {
//   return useQuery('Profile', async () => {
//     const req = new GetProfileRequest()
//     return await usersClient.getProfile(req)
//   })
// }

export async function setProfile(
  profile,
  {
    username,
    email,
    bio,
  }: {
    username: string
    email: string
    bio: string
  },
) {
  username.length > 1 && profile.setUsername(username)
  email.length > 1 && profile.setEmail(email)
  bio.length > 1 && profile.setBio(bio)
  const req = new UpdateProfileRequest()
  req.setProfile(profile)
  try {
    return await usersClient.updateProfile(req)
  } catch (err) {
    console.error('setProfileError ===> ', err)
  }
}

export function getAuthor(authorId: string) {
  const profile = queryCache.getQueryData('Profile') as Profile
  // TODO: (Horacio): FIXME not returning `me`..
  let author
  if (profile.toObject) {
    let p = profile.toObject()

    author = p.accountId === authorId ? 'me' : authorId
  }

  return author
}

export async function getProfileAddrs() {
  const req = new GetProfileAddrsRequest()
  return await usersClient.getProfileAddrs(req)
}

export function parseSlatetree(slateTree: Node[]) {
  // TODO: (horacio) Fixme types
  return slateTree.map((section: any) => {
    const {children, ...rest} = section

    return {
      ...rest,
      body: children.map(parseToMarkdown).join(''),
    }
  })
}

export {MintterPromiseClient}

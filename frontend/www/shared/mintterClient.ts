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
  GetProfileRequest,
  ConnectToPeerRequest,
  UpdateProfileRequest,
  InitProfileRequest,
  GetProfileAddrsRequest,
  ListProfilesRequest,
  ListProfilesResponse,
  GenSeedRequest,
} from '@mintter/proto/mintter_pb'
import {fromSlateToMarkdown} from './parseToMarkdown'
import {parseToMarkdown} from './parseToMarkdown'
import {profile} from 'console'

const config = getConfig()
const hostname = config?.publicRuntimeConfig.MINTTER_HOSTNAME
const port = config?.publicRuntimeConfig.MINTTER_PORT
const path = `${hostname}:${port}`

export const documentsClient = new DocumentsPromiseClient(path)
export const usersClient = new MintterPromiseClient(path)

// ============================

export async function genSeed() {
  const req = new GenSeedRequest()
  return await usersClient.genSeed(req)
}

export async function allPublications(
  key,
  page = 0,
): Promise<ListPublicationsResponse> {
  const req = new ListPublicationsRequest()
  req.setPageSize(page)
  return await documentsClient.listPublications(req)
}

export async function getPublication(key, id: string): Promise<Publication> {
  const req = new GetPublicationRequest()
  req.setPublicationId(id)

  return await documentsClient.getPublication(req)
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

export async function getDraft(key, id): Promise<Draft> {
  const req = new GetDraftRequest()
  req.setDocumentId(id)
  return await documentsClient.getDraft(req)
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
    console.error(
      `Impossible render: You are trying to access the editor passing ${
        documentId.length
      } document IDs => ${documentId.map(q => q).join(', ')}`,
    )

    return null
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
  try {
    const req = new PublishDraftRequest()
    req.setDocumentId(draftId)
    return await documentsClient.publishDraft(req)
  } catch (err) {
    console.error(`PublishDraft Error => `, err)
  }
}

export async function connectToPeerById(peerIds: string[]) {
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

export async function getProfile(key, profileId?: string) {
  const req = new GetProfileRequest()
  if (profileId) {
    req.setProfileId(profileId)
  }

  try {
    return await (await usersClient.getProfile(req)).getProfile()
  } catch (err) {
    console.error('getProfile error ==> ', err)
  }
}

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

export async function allConnections(
  key,
  page = 0,
): Promise<ListProfilesResponse> {
  const req = new ListProfilesRequest()
  req.setPageSize(page)
  return await usersClient.listProfiles(req)
}

export {MintterPromiseClient}

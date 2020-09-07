import getConfig from 'next/config'
import {Node} from 'slate'
import {MintterPromiseClient} from '@mintter/proto/mintter_grpc_web_pb'
import {DocumentsPromiseClient} from '@mintter/proto/documents_grpc_web_pb'
import {DocumentsPromiseClient as v2DocumentsClient} from '@mintter/proto/v2/documents_grpc_web_pb'
import {
  ListDocumentsRequest,
  ListDocumentsResponse,
  PublishingState,
  GetDocumentRequest,
  GetDocumentResponse,
  UpdateDraftRequest,
  UpdateDraftResponse,
  CreateDraftRequest,
  DeleteDocumentRequest,
  PublishDraftRequest,
  PublishDraftResponse,
  Document,
} from '@mintter/proto/v2/documents_pb'
import {
  GetProfileRequest,
  ConnectToPeerRequest,
  UpdateProfileRequest,
  InitProfileRequest,
  GetProfileAddrsRequest,
  ListProfilesRequest,
  ListProfilesResponse,
  GenSeedRequest,
  Profile,
  ListSuggestedProfilesResponse,
  ListSuggestedProfilesRequest,
} from '@mintter/proto/mintter_pb'
import {fromSlateToMarkdown} from './parseToMarkdown'
import {parseToMarkdown} from './parseToMarkdown'
import {profile} from 'console'
import {toDocument, EditorDocument} from '@mintter/editor'

const config = getConfig()
const hostname = config?.publicRuntimeConfig.MINTTER_HOSTNAME
const port = config?.publicRuntimeConfig.MINTTER_PORT
const path = `${hostname}:${port}`

export const documentsClient = new DocumentsPromiseClient(path)
export const docsV2 = new v2DocumentsClient(path)
export const usersClient = new MintterPromiseClient(path)

// ============================

export async function listDocuments(
  key,
  publishingState = PublishingState.PUBLISHED,
  page = 0,
): Promise<ListDocumentsResponse> {
  const req = new ListDocumentsRequest()
  req.setPageSize(page)
  req.setPublishingState(publishingState)
  return await docsV2.listDocuments(req)
}

export async function getDocument(
  key: string,
  id: string,
): Promise<GetDocumentResponse> {
  const req = new GetDocumentRequest()
  req.setId(id)

  const result = await docsV2.getDocument(req)
  console.log('result', result)
  return result
}

export async function createDraft(): Promise<Document> {
  const req = new CreateDraftRequest()
  return await docsV2.createDraft(req)
}

export interface SetDraftProps extends EditorDocument {
  author: any
}

export async function setDraft({
  id,
  title,
  subtitle,
  refs: entryBlocks,
  author,
}: SetDraftProps): Promise<UpdateDraftResponse> {
  const req = new UpdateDraftRequest()

  //  do I still need this guard?
  if (Array.isArray(id)) {
    console.error(
      `Impossible render: You are trying to access the editor passing ${
        id.length
      } document IDs => ${id.map(q => q).join(', ')}`,
    )

    return
  }

  const blockList = [] // TODO: add blockList transformer

  const {document, blocks} = toDocument({
    editorDocument: {
      title,
      id,
      subtitle,
      refs: entryBlocks,
    },
    author,
    blockList,
  })

  req.setDocument(document)
  // req.setBlocksList(blocks)
  return await docsV2.updateDraft(req)
}

export async function deleteDraft(version: string) {
  const req = new DeleteDocumentRequest()

  req.setVersion(version)
  return await docsV2.deleteDocument(req)
}

export async function publishDraft(
  version: string,
): Promise<PublishDraftResponse> {
  const req = new PublishDraftRequest()
  req.setVersion(version)

  return await docsV2.publishDraft(req)
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
  profile: Profile,
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

export async function genSeed() {
  const req = new GenSeedRequest()
  return await usersClient.genSeed(req)
}

export async function connectToPeerById(peerIds: string[]) {
  const req = new ConnectToPeerRequest()
  req.setAddrsList(peerIds)
  return await usersClient.connectToPeer(req)
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

export async function listConnections(
  key,
  page = 0,
): Promise<ListProfilesResponse> {
  const req = new ListProfilesRequest()
  req.setPageSize(page)
  return await usersClient.listProfiles(req)
}

export async function listSuggestedConnections(
  key,
  page = 0,
): Promise<ListSuggestedProfilesResponse> {
  const req = new ListSuggestedProfilesRequest()
  req.setPageSize(page)
  return await usersClient.listSuggestedProfiles(req)
}

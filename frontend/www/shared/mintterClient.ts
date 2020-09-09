import getConfig from 'next/config'
import {Node, NodeEntry} from 'slate'
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
  Block,
  Paragraph,
  InlineElement,
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
import {
  toDocument,
  EditorDocument,
  makeProto,
  Editor,
  toBlock,
  ELEMENT_BLOCK,
  SlateBlock,
} from '@mintter/editor'
import {v4 as uuid} from 'uuid'
import {getNodesByType} from '@udecode/slate-plugins'

const config = getConfig()
const hostname = config?.publicRuntimeConfig.MINTTER_HOSTNAME
const port = config?.publicRuntimeConfig.MINTTER_PORT
const path = `${hostname}:${port}`

export const documentsClient = new DocumentsPromiseClient(path)
export const docsV2 = new v2DocumentsClient(path)
export const usersClient = new MintterPromiseClient(path)

// ============================

async function listDocuments(
  key,
  publishingState = PublishingState.PUBLISHED,
  page = 0,
): Promise<ListDocumentsResponse> {
  const req = new ListDocumentsRequest()
  req.setPageSize(page)
  req.setPublishingState(publishingState)
  return await docsV2.listDocuments(req)
}

export function listPublications(key, page = 0) {
  return listDocuments(key, PublishingState.PUBLISHED, page)
}

export function listDrafts(key, page = 0) {
  return listDocuments(key, PublishingState.DRAFT, page)
}

export async function getDocument(
  key: string,
  version?: string,
): Promise<GetDocumentResponse> {
  const req = new GetDocumentRequest()
  req.setVersion(version)

  const document = await docsV2.getDocument(req)
  console.log('getDocument => ', document)
  return document
}

export async function createDraft(): Promise<Document> {
  const req = new CreateDraftRequest()
  return await docsV2.createDraft(req)
}

export interface SetDraftProps {
  version: string
  title: string
  subtitle: string
  refs: any
  author: any
}

export function setDocument(editor) {
  return async function({document, state}): Promise<any> {
    //  do I still need this guard?
    if (Array.isArray(document.version)) {
      console.error(
        `Impossible render: You are trying to access the editor passing ${
          document.version.length
        } document versions => ${document.version.map(q => q).join(', ')}`,
      )

      return
    }

    const genDocument = toDocument({document, state})
    const req = new UpdateDraftRequest()
    const nodes: any = getNodesByType(editor, ELEMENT_BLOCK, {
      at: [],
    }) // Iterable<NodeEntry<SlateBlock>>

    if (nodes) {
      const map: Map<string, Block> = req.getBlocksMap()
      for (let [node] of nodes) {
        let block: Block = toBlock(node)
        map.set(node.id, block)
      }
    }

    req.setDocument(genDocument)
    await docsV2.updateDraft(req)
  }
}

export async function deleteDocument(version: string): Promise<any> {
  const req = new DeleteDocumentRequest()

  req.setVersion(version)
  return await docsV2.deleteDocument(req)
}

export async function publishDraft(
  version: string,
): Promise<PublishDraftResponse> {
  console.log('hello!!')
  const req = new PublishDraftRequest()
  req.setVersion(version)
  console.log('version received => ', req)
  const result = await docsV2.publishDraft(req)
  console.log('result', result)
  return result
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

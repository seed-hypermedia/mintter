import {Accounts} from './.generated/accounts/v1alpha/accounts_connectweb'
import {Daemon} from './.generated/daemon/v1alpha/daemon_connectweb'
import {Changes} from './.generated/documents/v1alpha/changes_connectweb'
import {Comments} from './.generated/documents/v1alpha/comments_connectweb'
import {ContentGraph} from './.generated/documents/v1alpha/content_graph_connectweb'

import {
  Drafts,
  Publications,
} from './.generated/documents/v1alpha/documents_connectweb'
import {
  WebPublishing,
  WebSite,
} from './.generated/documents/v1alpha/web_publishing_connectweb'
import {Networking} from './.generated/networking/v1alpha/networking_connectweb'
import {PartialMessage} from '@bufbuild/protobuf'
import {
  Document,
  Publication as APIPublication,
} from './.generated/documents/v1alpha/documents_pb'
export {
  Account,
  Device,
  GetAccountRequest,
  ListAccountsRequest,
  ListAccountsResponse,
  Profile,
} from './.generated/accounts/v1alpha/accounts_pb'
export type {
  GenMnemonicRequest,
  GenMnemonicResponse,
  GetInfoRequest,
  Info,
  RegisterRequest,
  RegisterResponse,
} from './.generated/daemon/v1alpha/daemon_pb'
export {
  ChangeInfo,
  GetChangeInfoRequest,
} from './.generated/documents/v1alpha/changes_pb'
export {
  Conversation,
  CreateConversationRequest,
  ListConversationsRequest,
  ListConversationsResponse,
  Selector,
} from './.generated/documents/v1alpha/comments_pb'
export {
  Link as MttLink,
  LinkNode,
  ListCitationsResponse,
} from './.generated/documents/v1alpha/content_graph_pb'
export {
  Annotation,
  Block,
  BlockNode,
  CreateDraftRequest,
  DeleteDraftRequest,
  DeletePublicationRequest,
  DocumentChange,
  GetDraftRequest,
  GetPublicationRequest,
  ListDraftsRequest,
  ListDraftsResponse,
  ListPublicationsRequest,
  ListPublicationsResponse,
  PublishDraftRequest,
} from './.generated/documents/v1alpha/documents_pb'
export * from './.generated/documents/v1alpha/web_publishing_pb'
export {ConnectionStatus} from './.generated/networking/v1alpha/networking_pb'
export type {
  ConnectRequest,
  ConnectResponse,
  GetPeerInfoRequest,
  PeerInfo,
} from './.generated/networking/v1alpha/networking_pb'
export * from './.generated/types'
export * from './block-to-api'
export * from './block-to-slate'
export * from './change-creators'
export * from './client-utils'
export {Document}
export {
  Accounts,
  ContentGraph,
  Comments,
  Changes,
  Drafts,
  Publications,
  Daemon,
  Networking,
  WebPublishing,
  WebSite,
}

export type Publication = APIPublication & {
  document?: PartialMessage<Document>
}

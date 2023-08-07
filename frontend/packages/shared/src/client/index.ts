import {Accounts} from './.generated/accounts/v1alpha/accounts_connectweb'
import {Daemon} from './.generated/daemon/v1alpha/daemon_connectweb'
import {Changes} from './.generated/documents/v1alpha/changes_connectweb'
import {Groups} from './.generated/groups/v1alpha/groups_connectweb'
import {Comments} from './.generated/documents/v1alpha/comments_connectweb'
import {ContentGraph} from './.generated/documents/v1alpha/content_graph_connectweb'

import {PartialMessage} from '@bufbuild/protobuf'
import {
  Drafts,
  Publications,
} from './.generated/documents/v1alpha/documents_connectweb'
import {
  Publication as APIPublication,
  Document,
} from './.generated/documents/v1alpha/documents_pb'
import {
  WebPublishing,
  WebSite,
} from './.generated/documents/v1alpha/web_publishing_connectweb'
import {Networking} from './.generated/networking/v1alpha/networking_connectweb'

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
export type {
  Group,
  Role,
  ListGroupsRequest,
} from './.generated/groups/v1alpha/groups_pb'
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
  LinkNode,
  ListCitationsResponse,
  Link as MttLink,
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
export * from './client-utils'
export * from './hyperdocs-presentation'
export * from './editor-types'
export * from './server-to-editor'
export {
  Accounts,
  Changes,
  Comments,
  ContentGraph,
  Daemon,
  Document,
  Drafts,
  Groups,
  Networking,
  Publications,
  WebPublishing,
  WebSite,
}
export type Publication = APIPublication & {
  document?: PartialMessage<Document>
}

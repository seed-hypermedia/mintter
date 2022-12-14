export type {
  Account,
  Account_DevicesEntry,
  Device,
  GetAccountRequest,
  ListAccountsRequest,
  ListAccountsResponse,
  Profile,
} from './.generated/accounts/v1alpha/accounts'
export type {
  GenMnemonicRequest,
  GenMnemonicResponse,
  GetInfoRequest,
  Info,
  RegisterRequest,
  RegisterResponse,
} from './.generated/daemon/v1alpha/daemon'
export {
  Annotation,
  Block,
  BlockNode,
  GetPublicationRequest,
  Link,
  LinkNode,
  ListPublicationsRequest,
  ListPublicationsResponse,
  PublishDraftRequest,
  UpdateDraftRequestV2,
} from './.generated/documents/v1alpha/documents'
export {ConnectionStatus} from './.generated/networking/v1alpha/networking'
export * from './.generated/types'
export {createGrpcClient, MINTTER_API_URL_DEFAULT} from './grpc-client'
export type {GrpcClient} from './grpc-client'
export {
  getPublication,
  listCitations,
} from './publications'
import {
  Document,
  Publication as APIPublication,
} from './.generated/documents/v1alpha/documents'
export type Publication = APIPublication & {
  document: Document
}
export {Document}

export {getInfo} from './daemon'
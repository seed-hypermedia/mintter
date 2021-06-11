export const MINTTER_API_URL_DEFAULT = 'http://localhost:55001'

export {
  GetAccountRequest,
  ListAccountsRequest,
  StartAccountDiscoveryRequest,
  StartAccountDiscoveryResponse,
  Account,
  Account_DevicesEntry as AccountDevicesEntry,
  Profile,
  Device,
  DeviceRegistered,
  ProfileUpdated,
} from '../.generated/accounts/v1alpha/accounts'
export * from './accounts'

export {
  GenSeedRequest,
  GenSeedResponse,
  RegisterRequest,
  RegisterResponse,
  Info,
  GetInfoRequest,
} from '../.generated/daemon/v1alpha/daemon'
export * from './daemon'

export {
  ConnectionStatus,
  connectionStatusToJSON,
  connectionStatusFromJSON,
  StartObjectDiscoveryRequest,
  StartObjectDiscoveryResponse,
  StopObjectDiscoveryRequest,
  StopObjectDiscoveryResponse,
  GetPeerInfoRequest,
  ConnectRequest,
  ConnectResponse,
  PeerInfo,
  ObjectDiscoveryStatus,
  GetObjectDiscoveryStatusRequest,
} from '../.generated/networking/v1alpha/networking'
export * from './networking'

export {
  DocumentView,
  documentViewFromJSON,
  documentViewToJSON,
  ListStyle,
  listStyleFromJSON,
  listStyleToJSON,
  CreateDraftRequest,
  GetDraftRequest,
  ListDraftsRequest,
  ListDraftsResponse,
  PublishDraftRequest,
  PublishDraftResponse,
  GetPublicationRequest,
  DeletePublicationRequest,
  ListPublicationsRequest,
  ListPublicationsResponse,
  Publication,
  Document,
  Document_BlocksEntry as DocumentBlocksEntry,
  Document_LinksEntry as DocumentLinksEntry,
  Link,
  Block,
  Block_Type as BlockType,
  block_TypeFromJSON as blockTypeFromJSON,
  block_TypeToJSON as blockTypeToJSON,
  InlineElement,
  TextRun,
  Image,
  Quote,
} from '../.generated/documents/v1alpha/documents'
export * from './documents'
export * from './drafts'
export * from './publications'

export * as mintter from '../.generated/v2/mintter'
export * as documents from '../.generated/v2/documents'

export * as mock from './mock'

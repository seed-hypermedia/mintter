export {
  GetAccountRequest,
  ListAccountsRequest,
  Account,
  Account_DevicesEntry,
  Profile,
  Device,
  DeviceRegistered,
  ProfileUpdated,
} from '../.generated/accounts/v1alpha/accounts'

export {
  GenSeedRequest,
  GenSeedResponse,
  RegisterRequest,
  RegisterResponse,
  GetInfoRequest,
  Info,
} from '../.generated/daemon/v1alpha/daemon'

export {
  StartObjectDiscoveryRequest,
  StartObjectDiscoveryResponse,
  StopObjectDiscoveryRequest,
  StopObjectDiscoveryResponse,
  GetObjectDiscoveryStatusRequest,
  GetPeerInfoRequest,
  ConnectRequest,
  ConnectResponse,
  PeerInfo,
  ObjectDiscoveryStatus,
  ConnectionStatus,
} from '../.generated/networking/v1alpha/networking'

export {
  CreateDraftRequest,
  DeleteDraftRequest,
  GetDraftRequest,
  UpdateDraftRequest,
  ListDraftsRequest,
  ListDraftsResponse,
  PublishDraftRequest,
  GetPublicationRequest,
  DeletePublicationRequest,
  ListPublicationsRequest,
  ListPublicationsResponse,
  Publication,
  Document,
} from '../.generated/documents/v1alpha/documents'

export {createGrpcClient} from './grpc-client'

export {generateSeed, getAccount, registerAccount, updateAccount, listAccounts} from './accounts'
export {getInfo} from './daemon'
export {getDocument} from './documents'
export {createDraft, deleteDraft, updateDraft, listDrafts, publishDraft, getDraft} from './drafts'
export {listPeerAddrs, listSuggestedProfiles, connect, getPeerInfo} from './networking'
export {deletePublication, listPublications, getPublication} from './publications'

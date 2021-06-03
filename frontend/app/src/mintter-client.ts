import { Document, DocumentView, ListDraftsResponse, PublishDraftResponse, PublishDraftRequest, Publication, DeletePublicationRequest, ListPublicationsResponse, DraftsClientImpl, PublicationsClientImpl, GrpcWebImpl } from '@mintter/api/documents/v1alpha/documents'
import { GenSeedRequest, GenSeedResponse, RegisterRequest, RegisterResponse, GetInfoRequest, DaemonClientImpl } from '@mintter/api/daemon/v1alpha/daemon'
import { Account, GetAccountRequest, Profile, ListAccountsRequest, ListAccountsResponse, AccountsClientImpl } from '@mintter/api/accounts/v1alpha/accounts'
import { PeerInfo, GetPeerInfoRequest, NetworkingClientImpl } from '@mintter/api/networking/v1alpha/networking'
import type { Empty } from '@mintter/api/google/protobuf/empty'
import { createId } from '@utils/create-id';
import {
  buildDocument,
  buildPublication,
} from '@utils/generate';

/**
 * @TODO The url of the api should change depending on the context we're running in.
 */
const rpc = new GrpcWebImpl('http://localhost:55001', {})

export function draftsClient() {
  return new DraftsClientImpl(rpc)
}

export function publicationsClient() {
  return new PublicationsClientImpl(rpc)
}

export function daemonClient() {
  return new DaemonClientImpl(rpc)
}

export function accountsClient() {
  return new AccountsClientImpl(rpc)
}

export function networkingClient() {
  return new NetworkingClientImpl(rpc)
}

// =================

/**
 *
 * Drafts
 *
 */

export async function createDraft(): Promise<Document> {
  return Document.fromPartial({
    id: createId()
  })
}

export async function deleteDraft(documentId: string): Promise<any> {
  // noop
  return
}

export async function getDraft(draftId: string): Promise<Document> {
  let document = buildDocument({ id: draftId });

  return document
}

export async function updateDraft(document: Document): Promise<Document> {
  // noop
  console.log('updateDraft done for', Document.toJSON(document));
  return document
}

export async function listDrafts(
  pageSize?: number,
  pageToken?: string,
  view?: DocumentView,
): Promise<ListDraftsResponse> {
  return ListDraftsResponse.fromPartial({});
}

export function publishDraft(
  documentId: string,
): Promise<PublishDraftResponse> {
  let request = PublishDraftRequest.fromPartial({
    documentId
  });
  return draftsClient().PublishDraft(request);
}

/**
 *
 * Publications
 *
 */

export async function getPublication(
  publicationId: string,
  version?: string,
): Promise<Publication> {
  return Publication.fromPartial({});
}

export function getDocument(documentId: string) {
  return buildDocument();
}

export function deletePublication(version: string): Promise<Empty> {
  let request = DeletePublicationRequest.fromPartial({
    version
  });
  return publicationsClient().DeletePublication(request);
}

export async function listPublications(
  pageSize?: number,
  pageToken?: string,
  view?: DocumentView,
): Promise<ListPublicationsResponse> {
  // let request = new documents.ListPublicationsRequest();
  // if (pageSize) request.setPageSize(pageSize);
  // if (pageToken) request.setPageToken(pageToken);
  // if (view) request.setView(view);
  // return publicationsClient().listPublications(request);
  return ListPublicationsResponse.fromPartial({
    publications: [
      buildPublication(),
      buildPublication(),
      buildPublication(),
    ]
  })
}

/**
 *
 * Profile
 *
 */

export async function genSeed(
  aezeedPassphrase?: string,
): Promise<GenSeedResponse> {
  console.log('real genSeed!');

  let request = GenSeedRequest.fromPartial({});
  // TODO: add aezeedPassphrase?
  return await daemonClient().GenSeed(request);
}

export function register(
  mnemonicList: string[],
  aezeedPassphrase?: string,
  walletPassword?: any,
): Promise<RegisterResponse> {
  let request = RegisterRequest.fromPartial({
    mnemonic: mnemonicList,
    aezeedPassphrase: aezeedPassphrase
  });

  return daemonClient().Register(request);
}

export async function getAccount(id: string = ''): Promise<Account> {
  const request = GetAccountRequest.fromPartial({
    id
  });
  const result = await accountsClient().GetAccount(request);

  return result;
}

export async function getInfo() {
  const request = GetInfoRequest.fromPartial({});
  return await daemonClient().GetInfo(request);
}

// export function getAccount(id: string = ''): Promise<accounts.Account> {
//   const profile = makeProto(new accounts.Profile(), buildProfile());

//   const account = new accounts.Account();
//   account.setId(id);
//   account.setProfile(profile);
//   setDeviceMap(account.getDevicesMap(), buildDevices());

//   return account;
// }

// export function setDeviceMap(
//   map: Map<string, accounts.Device>,
//   devices: accounts.Device.AsObject[],
// ): void {
//   devices.forEach((device) => {
//     const n = new accounts.Device();
//     n.setPeerId(device.peerId);
//     map.set(device.peerId, n);
//   });
// }

export function updateAccount(
  entry: Profile,
): Promise<Account> {
  return accountsClient().UpdateProfile(entry);
}

export function listAccounts(
  pageSize?: number,
  pageToken?: string,
): Promise<ListAccountsResponse> {
  const request = ListAccountsRequest.fromPartial({
    pageSize,
    pageToken
  });
  return accountsClient().ListAccounts(request);
}

export async function listPeerAddrs(
  peerId: string,
): Promise<PeerInfo> {
  if (peerId === undefined) {
    return Promise.reject('listPeerAddrs error: `peerId (string)` is required');
  }
  const request = GetPeerInfoRequest.fromPartial({
    peerId
  });
  return await networkingClient().GetPeerInfo(request);
}

/**
 *
 * @deprecated
 */
export function listSuggestedProfiles(pageSize?: number, pageToken?: string) {
  console.log('listSuggestedProfiles: Implement!');
  return {};
}

/**
 *
 * @deprecated
 */
export function getProfileAddress() {
  console.log('getProfileAddress: Implement!');
  return {};
}

/**
 *
 * @deprecated
 */
export function connectToPeer(addresses: string[]) {
  console.log('connectToPeer: Implement!');
  return {};
}

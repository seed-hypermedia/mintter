import faker from 'faker';

import DocumentsClient /* , {
  DraftsClient,
} */ from '@mintter/api/documents/v1alpha/documents_grpc_web_pb';
import documents from '@mintter/api/documents/v1alpha/documents_pb';
import MintterClient from '@mintter/api/v2/mintter_grpc_web_pb';
import mintter from '@mintter/api/v2/mintter_pb';
import { id } from '@mintter/editor/id';
import { makeProto } from '@mintter/editor/transformers/make-proto';

import {
  /* buildDocument, */ buildProfile,
  buildPublication,
} from '@utils/generate';

const MINTTER_API_URL =
  import.meta.env.MINTTER_API_URL || 'http://localhost:55001';

/**
 * Detect which API url to use depending on the environment the app is being served from.
 * For production we bundle our app inside our Go binary, and it's being served on the same port
 * as the API. So for production we detect the URL from the browser and use the same URL to access the API.
 */

export function getApiUrl(): string {
  if (import.meta.env.NODE_ENV === 'production') {
    return window.location.origin;
  }

  return MINTTER_API_URL;
}

// This trick is required because we used to use API clients as globals,
// and Webpack would optimize API URL detection and it would hardcode the variable
// with the default URL without allowing it to change dynamically depending on the environment.
// See this for more details: https://www.notion.so/mintter/Global-state-in-code-is-considered-harmful-f75eda6d3f7842308d7745cdfd6c38b9
//
// TODO: avoid using global state.

let draftsClientInstance: DocumentsClient.DraftsPromiseClient;
let publicationsClientInstance: DocumentsClient.PublicationsPromiseClient;
let mintterClientInstance: MintterClient.MintterPromiseClient;

export function draftsClient() {
  if (!draftsClientInstance) {
    draftsClientInstance = new DocumentsClient.DraftsPromiseClient(getApiUrl());
  }

  return draftsClientInstance;
}

export function publicationsClient() {
  if (!publicationsClientInstance) {
    publicationsClientInstance = new DocumentsClient.PublicationsPromiseClient(
      getApiUrl(),
    );
  }

  return publicationsClientInstance;
}

export function mintterClient() {
  if (!mintterClientInstance) {
    mintterClientInstance = new MintterClient.MintterPromiseClient(getApiUrl());
  }

  return mintterClientInstance;
}

// =================

/**
 *
 * Drafts
 *
 */

export function createDraft(): Promise<documents.Document> {
  const draft = new documents.Document();
  draft.setId(id());
  return Promise.resolve(draft);
}

export function deleteDraft(/* documentId: string */): Promise<any> {
  // noop
  return Promise.resolve();
}

export function getDraft(draftId: string): Promise<documents.Document> {
  const document = new documents.Document();
  document.setId(draftId);

  return Promise.resolve(document);
}

export function updateDraft(
  document: documents.Document,
): Promise<documents.Document> {
  // noop
  console.log('updateDraft done for', document.toObject());
  return Promise.resolve(document);
}

export function listDrafts(): Promise<documents.ListDraftsResponse> {
  /* pageSize?: number,
  pageToken?: string,
  view?: documents.DocumentView, */
  const result = new documents.ListDraftsResponse();

  return Promise.resolve(result);
}

export function publishDraft(
  documentId: string,
): Promise<documents.PublishDraftResponse> {
  const request = new documents.PublishDraftRequest();
  request.setDocumentId(documentId);
  return draftsClient().publishDraft(request);
}

/**
 *
 * Publications
 *
 */

export function getPublication(): Promise<documents.Publication> {
  /* documentId: string,
  version?: string, */
  const pub = new documents.Publication();

  return Promise.resolve(pub);
}

export function deletePublication(version: string): Promise<any> {
  const request = new documents.DeletePublicationRequest();
  request.setVersion(version);
  return publicationsClient().deletePublication(request);
}

export function listPublications(): Promise<documents.ListPublicationsResponse> {
  /* pageSize?: number,
  pageToken?: string,
  view?: documents.DocumentView, */
  // let request = new documents.ListPublicationsRequest();
  // if (pageSize) request.setPageSize(pageSize);
  // if (pageToken) request.setPageToken(pageToken);
  // if (view) request.setView(view);
  // return publicationsClient().listPublications(request);
  const res = new documents.ListPublicationsResponse();
  res.setPublicationsList([
    buildPublication(),
    buildPublication(),
    buildPublication(),
  ]);
  return Promise.resolve(res);
}

/**
 *
 * Profile
 *
 */

export function genSeed(/* aezeedPassphrase?: string */) {
  const response = new mintter.GenSeedResponse();
  const seed = Array(24);
  seed.map(() => faker.lorem.word());
  response.setMnemonicList(seed);
  return Promise.resolve(response);
}

//TODO: type initProfile parameters
export function initProfile(
  mnemonicList: any,
  aezeedPassphrase?: any,
  walletPassword?: any,
): Promise<mintter.InitProfileResponse> {
  const request = new mintter.InitProfileRequest();
  request.setMnemonicList(mnemonicList);
  if (aezeedPassphrase) {
    request.setAezeedPassphrase(aezeedPassphrase);
  }
  if (walletPassword) {
    request.setWalletPassword(walletPassword);
  }
  return mintterClient().initProfile(request);
}

export function getProfile(
  accountId?: string,
): Promise<mintter.GetProfileResponse> {
  const response = new mintter.GetProfileResponse();
  const profile = makeProto(new mintter.Profile(), buildProfile({ accountId }));
  response.setProfile(profile);

  return Promise.resolve(response);
}

// export function getProfile(
//   profileId?: string,
// ): Promise<mintter.GetProfileResponse> {
//   let request = new mintter.GetProfileRequest();
//   if (profileId) {
//     request.setProfileId(profileId);
//   }
//   return mintterClient().getProfile(request);
// }

type UpdateProfileParams = {
  username?: string;
  email?: string;
  bio?: string;
};

export async function updateProfile(
  params: UpdateProfileParams,
): Promise<mintter.UpdateProfileResponse> {
  const { username = '', email = '', bio = '' } = params;
  const profile = (await (await getProfile()).getProfile()) as mintter.Profile;
  profile.setUsername(username);
  profile.setEmail(email);
  profile.setBio(bio);
  const request = new mintter.UpdateProfileRequest();
  request.setProfile(profile);
  return mintterClient().updateProfile(request);
}

export function listProfiles(
  pageSize?: number,
  pageToken?: string,
): Promise<mintter.ListProfilesResponse> {
  const request = new mintter.ListProfilesRequest();
  if (pageSize) {
    request.setPageSize(pageSize);
  }
  if (pageToken) {
    request.setPageToken(pageToken);
  }
  return mintterClient().listProfiles(request);
}

export function listSuggestedProfiles(
  pageSize?: number,
  pageToken?: string,
): Promise<mintter.ListSuggestedProfilesResponse> {
  const request = new mintter.ListSuggestedProfilesRequest();
  if (pageSize) {
    request.setPageSize(pageSize);
  }
  if (pageToken) {
    request.setPageToken(pageToken);
  }

  return mintterClient().listSuggestedProfiles(request);
}

export function getProfileAddress(): Promise<mintter.GetProfileAddrsResponse> {
  const request = new mintter.GetProfileAddrsRequest();
  return mintterClient().getProfileAddrs(request);
}

export function connectToPeer(
  addresses: string[],
): Promise<mintter.ConnectToPeerResponse> {
  const request = new mintter.ConnectToPeerRequest();
  request.setAddrsList(addresses);
  return mintterClient().connectToPeer(request);
}

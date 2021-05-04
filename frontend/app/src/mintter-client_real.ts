import DocumentsClient, {
  DraftsClient,
} from '@mintter/api/documents/v1alpha/documents_grpc_web_pb';
import documents from '@mintter/api/documents/v1alpha/documents_pb';
import MintterClient from '@mintter/api/v2/mintter_grpc_web_pb';
import mintter from '@mintter/api/v2/mintter_pb';

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
  let request = new documents.CreateDraftRequest();
  return draftsClient().createDraft(request);
}

export function deleteDraft(documentId: string): Promise<any> {
  let request = new documents.DeleteDraftRequest();
  request.setDocumentId(documentId);
  return draftsClient().deleteDraft(request);
}

export function getDraft(documentId: string): Promise<documents.Document> {
  let request = new documents.GetDraftRequest();
  request.setDocumentId(documentId);
  return draftsClient().getDraft(request);
}

export function updateDraft(
  document: documents.Document,
): Promise<documents.Document> {
  let request = new documents.UpdateDraftRequest();
  request.setDocument(document);
  return draftsClient().updateDraft(request);
}

export function listDrafts(
  pageSize?: number,
  pageToken?: string,
  view?: documents.DocumentView,
): Promise<documents.ListDraftsResponse> {
  let request = new documents.ListDraftsRequest();
  if (pageSize) {
    request.setPageSize(pageSize);
  }

  if (pageToken) {
    request.setPageToken(pageToken);
  }
  if (view) {
    request.setView(view);
  }
  return draftsClient().listDrafts(request);
}

export function publishDraft(
  documentId: string,
): Promise<documents.PublishDraftResponse> {
  let request = new documents.PublishDraftRequest();
  request.setDocumentId(documentId);
  return draftsClient().publishDraft(request);
}

/**
 *
 * Publications
 *
 */

export function getPublication(
  documentId: string,
  version?: string,
): Promise<documents.Publication> {
  let request = new documents.GetPublicationRequest();
  request.setDocumentId(documentId);
  if (version) {
    request.setVersion(version);
  }

  return publicationsClient().getPublication(request);
}

export function deletePublication(version: string): Promise<any> {
  let request = new documents.DeletePublicationRequest();
  request.setVersion(version);
  return publicationsClient().deletePublication(request);
}

export function listPublications(
  pageSize?: number,
  pageToken?: string,
  view?: documents.DocumentView,
): Promise<documents.ListPublicationsResponse> {
  let request = new documents.ListPublicationsRequest();
  if (pageSize) request.setPageSize(pageSize);
  if (pageToken) request.setPageToken(pageToken);
  if (view) request.setView(view);
  return publicationsClient().listPublications(request);
}

/**
 *
 * Profile
 *
 */

export function genSeed(aezeedPassphrase?: string) {
  let request = new mintter.GenSeedRequest();
  // TODO: add aezeedPassphrase?
  return mintterClient().genSeed(request);
}

//TODO: type initProfile parameters
export function initProfile(
  mnemonicList: any,
  aezeedPassphrase?: any,
  walletPassword?: any,
): Promise<mintter.InitProfileResponse> {
  let request = new mintter.InitProfileRequest();
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
  profileId?: string,
): Promise<mintter.GetProfileResponse> {
  let request = new mintter.GetProfileRequest();
  if (profileId) {
    request.setProfileId(profileId);
  }
  return mintterClient().getProfile(request);
}

type UpdateProfileParams = {
  username?: string;
  email?: string;
  bio?: string;
};

export async function updateProfile(
  params: UpdateProfileParams,
): Promise<mintter.UpdateProfileResponse> {
  const { username = '', email = '', bio = '' } = params;
  let profile = (await (await getProfile()).getProfile()) as mintter.Profile;
  profile.setUsername(username);
  profile.setEmail(email);
  profile.setBio(bio);
  let request = new mintter.UpdateProfileRequest();
  request.setProfile(profile);
  return mintterClient().updateProfile(request);
}

export function listProfiles(
  pageSize?: number,
  pageToken?: string,
): Promise<mintter.ListProfilesResponse> {
  let request = new mintter.ListProfilesRequest();
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
  let request = new mintter.ListSuggestedProfilesRequest();
  if (pageSize) {
    request.setPageSize(pageSize);
  }
  if (pageToken) {
    request.setPageToken(pageToken);
  }

  return mintterClient().listSuggestedProfiles(request);
}

export function getProfileAddress(): Promise<mintter.GetProfileAddrsResponse> {
  let request = new mintter.GetProfileAddrsRequest();
  return mintterClient().getProfileAddrs(request);
}

export function connectToPeer(
  addresses: string[],
): Promise<mintter.ConnectToPeerResponse> {
  let request = new mintter.ConnectToPeerRequest();
  request.setAddrsList(addresses);
  return mintterClient().connectToPeer(request);
}

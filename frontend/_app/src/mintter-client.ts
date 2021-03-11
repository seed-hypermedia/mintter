import DocumentsClient from '@mintter/api/documents/v1alpha/documents_grpc_web_pb';
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

export async function getProfile(
  profileId?: string,
): Promise<mintter.Profile | undefined> {
  const request = new mintter.GetProfileRequest();
  if (profileId) {
    request.setProfileId(profileId);
  }
  return await (await mintterClient().getProfile(request)).getProfile();
}

export async function listDocuments(
  page = 0,
): Promise<documents.ListPublicationsResponse> {
  const request = new documents.ListPublicationsRequest();
  request.setPageSize(page);
  return await publicationsClient().listPublications(request);
}

import {client} from './client'
import {
  AddSiteRequest,
  ListSitesRequest,
  SitesClientImpl,
} from './.generated/daemon/v1alpha/sites'

export async function addSite(hostname: string, inviteToken?: string) {
  return await new SitesClientImpl(client).addSite(
    AddSiteRequest.fromPartial({
      hostname,
      inviteToken,
    }),
  )
}

export async function listSites() {
  return await new SitesClientImpl(client).listSites(
    ListSitesRequest.fromPartial({}),
  )
}

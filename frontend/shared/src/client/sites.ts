import {client} from './client'
import {
  AddSiteRequest,
  ListSitesRequest,
  ListSitesResponse,
  DeleteSiteRequest,
  SitesClientImpl,
} from './.generated/daemon/v1alpha/sites'
import {
  SiteClientImpl,
  CreateInviteTokenRequest,
  BlockAccountRequest,
  DeleteMemberRequest,
  GetMemberRequest,
  Member_Role,
  ListMembersRequest,
  GetSiteInfoRequest,
  ListBlockedAccountsRequest,
  RedeemInviteTokenRequest,
  UnblockAccountRequest,
  UpdateSiteInfoRequest,
  PublishRequest,
  UnpublishRequest,
} from './.generated/site/v1alpha/site'
import {ListPublicationsRequest} from './.generated/documents/v1alpha/documents'

export async function addSite(hostname: string, inviteToken?: string) {
  return await new SitesClientImpl(client).addSite(
    AddSiteRequest.fromPartial({
      hostname,
      inviteToken,
    }),
  )
}

export async function listSites(): Promise<ListSitesResponse> {
  // EV TESTING:
  // return {
  //   sites: [
  //     {
  //       hostname: 'temp-test.org',
  //       role: Member_Role.OWNER,
  //     },
  //   ],
  //   nextPageToken: '',
  // }
  return await new SitesClientImpl(client).listSites(
    ListSitesRequest.fromPartial({}),
  )
}

export async function deleteSite(hostname: string) {
  return await new SitesClientImpl(client).deleteSite(
    DeleteSiteRequest.fromPartial({
      hostname,
    }),
  )
}

async function sendSiteRequest<Result>(
  hostname: string,
  perform: (client: SiteClientImpl) => Promise<Result>,
) {
  const siteClient = new SiteClientImpl(client)
  // todo: set hostname header
  return await perform(siteClient)
}

export async function siteCreateInviteToken(hostname: string) {
  return await sendSiteRequest(hostname, (client) =>
    client.createInviteToken(
      CreateInviteTokenRequest.fromPartial({
        role: Member_Role.EDITOR,
      }),
    ),
  )
}

export async function siteBlockAccount(hostname: string, accountId: string) {
  return await sendSiteRequest(hostname, (client) =>
    client.blockAccount(
      BlockAccountRequest.fromPartial({
        accountId,
      }),
    ),
  )
}
export async function siteDeleteMember(hostname: string, accountId: string) {
  return await sendSiteRequest(hostname, (client) =>
    client.deleteMember(
      DeleteMemberRequest.fromPartial({
        accountId,
      }),
    ),
  )
}
export async function siteGetMember(hostname: string, accountId: string) {
  return await sendSiteRequest(hostname, (client) =>
    client.getMember(
      GetMemberRequest.fromPartial({
        accountId,
      }),
    ),
  )
}
export async function siteListMembers(hostname: string) {
  return await sendSiteRequest(hostname, (client) =>
    client.listMembers(ListMembersRequest.fromPartial({})),
  )
}
export async function siteGetSiteInfo(hostname: string) {
  return await sendSiteRequest(hostname, (client) =>
    client.getSiteInfo(GetSiteInfoRequest.fromPartial({})),
  )
}
export async function siteListBlockedAccounts(hostname: string) {
  return await sendSiteRequest(hostname, (client) =>
    client.listBlockedAccounts(ListBlockedAccountsRequest.fromPartial({})),
  )
}
export async function siteRedeemInviteToken(
  hostname: string,
  accountId: string,
  deviceId: string,
  token: string,
) {
  return await sendSiteRequest(hostname, (client) =>
    client.redeemInviteToken(
      RedeemInviteTokenRequest.fromPartial({
        accountId,
        deviceId,
        token,
      }),
    ),
  )
}
export async function siteUnblockAccount(hostname: string, accountId: string) {
  return await sendSiteRequest(hostname, (client) =>
    client.unblockAccount(
      UnblockAccountRequest.fromPartial({
        accountId,
      }),
    ),
  )
}
export async function siteUpdateSiteInfo(
  hostname: string,
  title?: string,
  description?: string,
) {
  return await sendSiteRequest(hostname, (client) =>
    client.updateSiteInfo(
      UpdateSiteInfoRequest.fromPartial({
        description,
        title,
      }),
    ),
  )
}

export async function listWebPublications(hostname: string) {
  // EV TESTING:
  // return {
  //   publications: [
  //     {
  //       docId: 'lol',
  //       authorName: 'Horacio',
  //       publicationId: '123',
  //       updateTime: new Date(),
  //       docTitle: 'The Home Document',
  //       path: '',
  //     },
  //     {
  //       docId: '1',
  //       authorName: 'Eric',
  //       publicationId: '1233',
  //       updateTime: new Date(),
  //       docTitle: 'The Title at Thepath',
  //       path: 'thepath',
  //     },
  //     {
  //       docId: '2',
  //       authorName: 'Eric',
  //       publicationId: '1234',
  //       updateTime: new Date(),
  //       docTitle: 'The Unlisted Title',
  //     },
  //   ] as ListedWebPublication[],
  // }

  return await sendSiteRequest(hostname, (client) =>
    client.listPublications(ListPublicationsRequest.fromPartial({})),
  )
}

export async function publishDoc(
  hostname: string,
  docId: string,
  path: string,
) {
  return await sendSiteRequest(hostname, (client) =>
    client.publish(
      PublishRequest.fromPartial({
        docId,
        path,
      }),
    ),
  )
}

export async function unpublish(hostname: string, publicationId: string) {
  return await sendSiteRequest(hostname, (client) =>
    client.unpublish(
      UnpublishRequest.fromPartial({
        publicationId,
      }),
    ),
  )
}

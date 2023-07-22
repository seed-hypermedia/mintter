import {createPromiseClient, PromiseClient} from '@bufbuild/connect-web'
import {
  Accounts,
  Changes,
  Comments,
  ContentGraph,
  Daemon,
  Drafts,
  Networking,
  Publications,
  WebPublishing,
  WebSite,
} from './client'

export type GRPCClient = {
  accounts: PromiseClient<typeof Accounts>
  contentGraph: PromiseClient<typeof ContentGraph>
  comments: PromiseClient<typeof Comments>
  changes: PromiseClient<typeof Changes>
  drafts: PromiseClient<typeof Drafts>
  publications: PromiseClient<typeof Publications>
  daemon: PromiseClient<typeof Daemon>
  networking: PromiseClient<typeof Networking>
  webPublishing: PromiseClient<typeof WebPublishing>
  webSite: PromiseClient<typeof WebSite>
}

export function createGRPCClient(transport: any): GRPCClient {
  return {
    accounts: createPromiseClient(Accounts, transport),
    contentGraph: createPromiseClient(ContentGraph, transport),
    comments: createPromiseClient(Comments, transport),
    changes: createPromiseClient(Changes, transport),
    drafts: createPromiseClient(Drafts, transport),
    publications: createPromiseClient(Publications, transport),
    daemon: createPromiseClient(Daemon, transport),
    networking: createPromiseClient(Networking, transport),
    webPublishing: createPromiseClient(WebPublishing, transport),
    webSite: createPromiseClient(WebSite, transport),
  } as const
}

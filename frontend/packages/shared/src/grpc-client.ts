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
  Groups,
} from './client'

export type GRPCClient = {
  accounts: PromiseClient<typeof Accounts>
  contentGraph: PromiseClient<typeof ContentGraph>
  comments: PromiseClient<typeof Comments>
  changes: PromiseClient<typeof Changes>
  groups: PromiseClient<typeof Groups>
  drafts: PromiseClient<typeof Drafts>
  publications: PromiseClient<typeof Publications>
  daemon: PromiseClient<typeof Daemon>
  networking: PromiseClient<typeof Networking>
  webPublishing: PromiseClient<typeof WebPublishing>
  webSite: PromiseClient<typeof WebSite>
  getRemoteWebClient: (siteOrigin: string) => PromiseClient<typeof WebSite>
}

export function createGRPCClient(transport: any): GRPCClient {
  const localWebSite = createPromiseClient(WebSite, transport)

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
    groups: createPromiseClient(Groups, transport),
    webSite: localWebSite,
    getRemoteWebClient: (siteOrigin: string) => {
      return Object.fromEntries(
        Object.entries(localWebSite).map(([rpcCallName, rpcHandler]) => {
          return [
            rpcCallName,
            async (input: Parameters<typeof rpcHandler>[0]) => {
              return rpcHandler(input, {
                headers: {
                  'x-mintter-site-hostname': siteOrigin,
                },
              })
            },
          ]
        }),
      ) as typeof localWebSite
    },
  } as const
}

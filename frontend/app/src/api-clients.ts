import {
  createGrpcWebTransport,
  createPromiseClient,
} from '@bufbuild/connect-web'
import {
  Accounts,
  Changes,
  Comments,
  ContentGraph,
  Daemon,
  Drafts,
  loggingInterceptor,
  Networking,
  Publications,
  WebPublishing,
  WebSite,
} from '@mintter/shared'

export const transport = createGrpcWebTransport({
  baseUrl: 'http://localhost:55001',
  interceptors: import.meta.env.DEV ? [loggingInterceptor] : [],
})

export const draftsClient = createPromiseClient(Drafts, transport)
export const publicationsClient = createPromiseClient(Publications, transport)
export const accountsClient = createPromiseClient(Accounts, transport)
export const commentsClient = createPromiseClient(Comments, transport)
export const changesClient = createPromiseClient(Changes, transport)
export const contentGraphClient = createPromiseClient(ContentGraph, transport)
export const daemonClient = createPromiseClient(Daemon, transport)
export const networkingClient = createPromiseClient(Networking, transport)
export const webPublishingClient = createPromiseClient(WebPublishing, transport)
export const websiteClient = createPromiseClient(WebSite, transport)

export function getWebSiteClient(hostname: string) {
  return Object.fromEntries(
    Object.entries(websiteClient).map(([rpcCallName, rpcHandler]) => {
      return [
        rpcCallName,
        async (input: Parameters<typeof rpcHandler>[0]) => {
          return rpcHandler(input, {
            headers: {
              'x-mintter-site-hostname': hostname,
            },
          })
        },
      ]
    }),
  ) as typeof websiteClient
}

// export function getLocalWebSiteClient(rpc: Transport = transport) {
//   return createPromiseClient(WebSite, rpc)
// }

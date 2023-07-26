import {
  createGrpcWebTransport,
  createPromiseClient,
  Interceptor,
} from '@bufbuild/connect-web'
import {BACKEND_HTTP_PORT, BACKEND_HTTP_URL} from '@mintter/app/src/constants'
import {
  Accounts,
  Changes,
  Comments,
  ContentGraph,
  Daemon,
  Drafts,
  loggingInterceptor,
  Networking,
  prodInter,
  Publications,
  WebPublishing,
  WebSite,
} from '@mintter/shared'
import {toast} from 'react-hot-toast'

export const toastInterceptor: Interceptor = (next) => async (req) => {
  try {
    const result = await next(req)
    // @ts-ignore
    // console.log(`🔃 to ${req.method.name} `, req.message, result)
    return result
  } catch (e) {
    console.error('📣 🚨', req.message, e)
    throw e
  }
}

export const transport = createGrpcWebTransport({
  baseUrl: BACKEND_HTTP_URL,
  interceptors: import.meta.env.DEV
    ? [loggingInterceptor, toastInterceptor]
    : [loggingInterceptor, toastInterceptor, prodInter],
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

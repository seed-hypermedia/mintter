import {
  WebPublishing,
  WebSite,
} from './.generated/documents/v1alpha/web_publishing_connectweb'
import {transport} from './client'
import {Transport, createPromiseClient} from '@bufbuild/connect-web'

export function getWebPublishingClient(rpc: Transport = transport) {
  return createPromiseClient(WebPublishing, rpc)
}

export function getWebSiteClient(hostname: string, rpc: Transport = transport) {
  const client = createPromiseClient(WebSite, rpc)
  return Object.fromEntries(
    Object.entries(client).map(([rpcCallName, rpcHandler]) => {
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
  ) as typeof client
}

export function getLocalWebSiteClient(rpc: Transport = transport) {
  return createPromiseClient(WebSite, rpc)
}

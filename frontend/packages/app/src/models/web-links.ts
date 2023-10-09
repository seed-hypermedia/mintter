import {AppQueryClient} from '@mintter/app/src/query-client'
import {useQuery} from '@tanstack/react-query'
import {queryKeys} from './query-keys'
import {extractBlockRefOfUrl} from '@mintter/shared'

function parseHTML(html: string): Document {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  return doc
}
function extractMetaTagValue(doc: Document, name: string): string | null {
  const metaTag = doc.querySelector(`meta[name="${name}"]`)
  return metaTag ? metaTag.getAttribute('content') : null
}

function queryWebLink(url: string, enabled: boolean) {
  return {
    queryKey: [queryKeys.GET_URL, url],
    enabled,
    queryFn: async () => {
      if (!url) return null
      try {
        if (!url.startsWith('http')) return null
        const webResponse = await fetch(url, {
          method: 'GET',
        })

        // // for some reason the headers aren't coming through?! perhaps due to CORS issues??
        // return {
        //   documentId: webResponse.headers.get('x-hm-entity-id'),
        //   documentVersion: webResponse.headers.get(
        //     'x-hm-entity-version',
        //   ),
        // }

        // parsing for the meta tags is heavier but works, no problem
        const htmlData = await webResponse.text()
        const doc = parseHTML(htmlData)
        const hmId = extractMetaTagValue(doc, 'hypermedia-entity-id')
        const hmVersion = extractMetaTagValue(doc, 'hypermedia-entity-version')
        const hmTitle = extractMetaTagValue(doc, 'hypermedia-entity-title')
        return {
          hmId,
          hmVersion,
          hmTitle,
          blockRef: extractBlockRefOfUrl(url),
        }
      } catch (e) {
        return null
      }
    },
  }
}

export function useWebLink(url: string, enabled: boolean) {
  return useQuery(queryWebLink(url, enabled))
}
export function fetchWebLink(appClient: AppQueryClient, url: string) {
  return appClient.client.fetchQuery(queryWebLink(url, true))
}

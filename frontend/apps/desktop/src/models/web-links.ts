import {appQueryClient} from '@app/query-client'
import {useQuery} from '@tanstack/react-query'
import {queryKeys} from './query-keys'

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

        // // for some reason the headers aren't coming through?!
        // return {
        //   documentId: webResponse.headers.get('x-mintter-document-id'),
        //   documentVersion: webResponse.headers.get(
        //     'x-mintter-document-version',
        //   ),
        // }

        // parsing for the meta tags is heavier but works, no problem
        const htmlData = await webResponse.text()
        const doc = parseHTML(htmlData)
        return {
          documentId: extractMetaTagValue(doc, 'mintter-document-id'),
          documentVersion:
            extractMetaTagValue(doc, 'mintter-document-version') || undefined,
          documentTitle:
            extractMetaTagValue(doc, 'mintter-document-title') ||
            doc.querySelector('title')?.innerText ||
            url,
          blockId: url.match(/#(.*)$/)?.[1] || undefined,
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
export function fetchWebLink(url: string) {
  return appQueryClient.fetchQuery(queryWebLink(url, true))
}

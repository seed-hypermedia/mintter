import {useQuery} from '@tanstack/react-query'
import {queryKeys} from './query-keys'
import {AppQueryClient} from '@mintter/app/src/query-client'

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
        //   documentId: webResponse.headers.get('x-hd-document-id'),
        //   documentVersion: webResponse.headers.get(
        //     'x-mintter-document-version',
        //   ),
        // }

        // parsing for the meta tags is heavier but works, no problem
        const htmlData = await webResponse.text()
        const doc = parseHTML(htmlData)
        const fallbackDocumentId = extractMetaTagValue(
          doc,
          'hyperdocs-document-id',
        )
        const fallbackDocumentVersion =
          extractMetaTagValue(doc, 'hyperdocs-document-version') || undefined
        const fallbackDocumentTitle =
          extractMetaTagValue(doc, 'hyperdocs-document-title') ||
          doc.querySelector('title')?.innerText ||
          url

        // new aer meta tags
        const hdEntityId = extractMetaTagValue(doc, 'hyperdocs-entity-id')
        const hdIdMatch = hdEntityId ? hdEntityId.match(/hd:\/\/d\/(.*)/) : null
        const hdDocId = hdIdMatch?.[1]
        const hdEntityVersion = extractMetaTagValue(
          doc,
          'hyperdocs-entity-version',
        )
        const hdEntityTitle = extractMetaTagValue(doc, 'hyperdocs-entity-title')

        return {
          documentId: hdDocId || fallbackDocumentId,
          documentVersion: hdEntityVersion || fallbackDocumentVersion,
          documentTitle: hdEntityTitle || fallbackDocumentTitle,
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
export function fetchWebLink(appClient: AppQueryClient, url: string) {
  return appClient.client.fetchQuery(queryWebLink(url, true))
}

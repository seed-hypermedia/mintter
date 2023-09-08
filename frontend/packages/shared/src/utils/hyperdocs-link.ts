import {
  extractHypermediaWebsiteValues,
  getIdsfromUrl,
  HYPERMEDIA_DOCUMENT_PREFIX,
} from './get-ids-from-url'

export function isHypermediaScheme(url?: string) {
  return !!url?.startsWith(HYPERMEDIA_DOCUMENT_PREFIX)
}

export function isMintterGatewayLink(text: string) {
  return extractHypermediaWebsiteValues(text)
}

export function normalizeHypermediaLink(urlMaybe: string): string | undefined {
  if (isHypermediaScheme(urlMaybe)) return urlMaybe
  if (isMintterGatewayLink(urlMaybe)) {
    const [docId, version, blockRef] = getIdsfromUrl(urlMaybe)

    if (docId && docId != 'undefined') {
      return createHyperdocsDocLink(docId, version, blockRef)
    }
    return undefined
  }
}

export function createLinkParams(
  documentId: string,
  version?: string | null,
  blockRef?: string | null,
): string {
  let res = documentId
  if (version) res += `?v=${version}`
  if (blockRef) res += `${!blockRef.startsWith('#') ? '#' : ''}${blockRef}`

  return res
}

export function createHyperdocsDocLink(
  documentId: string,
  version?: string | null,
  blockRef?: string | null,
): string {
  return `${HYPERMEDIA_DOCUMENT_PREFIX}${createLinkParams(
    documentId,
    version,
    blockRef,
  )}`
}

export function createMintterLink(
  documentId: string,
  version?: string | null,
  blockRef?: string | null,
): string {
  return `https://mintter.com/d/${createLinkParams(
    documentId,
    version,
    blockRef,
  )}`
}

import {getIdsfromUrl, HYPERDOCS_LINK_PREFIX} from './get-ids-from-url'

export function isHyperdocsScheme(url?: string) {
  return !!url?.startsWith(HYPERDOCS_LINK_PREFIX)
}

export function isMintterGatewayLink(text: string) {
  return (
    text.startsWith('https://mintter.com/d/') ||
    text.startsWith('https://www.mintter.com/d/')
  )
}

export function normalizeHyperdocsLink(urlMaybe: string): string | undefined {
  if (isHyperdocsScheme(urlMaybe)) return urlMaybe
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
  return `${HYPERDOCS_LINK_PREFIX}${createLinkParams(
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

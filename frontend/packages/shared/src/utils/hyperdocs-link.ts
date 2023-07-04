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
    if (docId) {
      return createHyperdocsDocLink(docId, version, blockRef)
    }
    return undefined
  }
}

export function createHyperdocsDocLink(
  documentId: string,
  version?: string | null,
  blockRef?: string | null,
): string {
  let res = `${HYPERDOCS_LINK_PREFIX}${documentId}`
  if (version) res += `?v=${version}`
  if (blockRef) res += `#${blockRef}`

  return res
}

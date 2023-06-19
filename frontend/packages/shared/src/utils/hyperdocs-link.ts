import {getIdsfromUrl, HYPERDOCS_LINK_PREFIX} from './get-ids-from-url'

export function isMintterScheme(text?: string) {
  return !!text?.startsWith(HYPERDOCS_LINK_PREFIX)
}

export function isMintterGatewayLink(text: string) {
  return (
    text.startsWith('https://mintter.com/p/') ||
    text.startsWith('https://www.mintter.com/p/')
  )
}

export function normalizeMintterLink(urlMaybe: string): string | undefined {
  if (isMintterScheme(urlMaybe)) return urlMaybe
  if (isMintterGatewayLink(urlMaybe)) {
    const [docId, version, blockRef] = getIdsfromUrl(urlMaybe)
    if (docId) {
      let url = `${HYPERDOCS_LINK_PREFIX}${docId}`
      if (version) {
        url += `?v=${version}`
      }
      if (blockRef) {
        url += `#${blockRef}`
      }
      return url
    }
    return undefined
  }
}

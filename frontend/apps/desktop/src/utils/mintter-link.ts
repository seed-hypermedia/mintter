import {MINTTER_LINK_PREFIX, getIdsfromUrl} from '@mintter/shared'

export function isMintterScheme(text: string) {
  return text.startsWith(MINTTER_LINK_PREFIX)
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
      let url = `${MINTTER_LINK_PREFIX}${docId}`
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

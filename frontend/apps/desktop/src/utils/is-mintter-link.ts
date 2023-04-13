import {MINTTER_LINK_PREFIX} from '@mintter/shared'

export function isMintterLink(text: string) {
  return text.startsWith(MINTTER_LINK_PREFIX)
}

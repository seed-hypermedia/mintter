import {MINTTER_LINK_PREFIX} from '@app/constants'

export function isMintterLink(text: string) {
  return text.startsWith(MINTTER_LINK_PREFIX)
}

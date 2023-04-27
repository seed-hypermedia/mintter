import {MINTTER_LINK_PREFIX} from '@mintter/shared'

export function isMintterScheme(text: string) {
  return text.startsWith(MINTTER_LINK_PREFIX)
}

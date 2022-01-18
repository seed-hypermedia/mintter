import {H} from '../types'

export function resolve(h: H, url: string | null) {
  if (url == null) return ''

  if (h.frozenBaseUrl) {
    return String(new URL(url, h.frozenBaseUrl))
  }

  return url
}

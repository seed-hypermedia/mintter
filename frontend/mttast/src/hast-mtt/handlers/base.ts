import {Element} from 'hast'
import {H} from '../types'

export function base(h: H, node: Element) {
  if (!h.baseFound) {
    h.frozenBaseUrl = String((node.properties && node.properties.href) || '') || null
    h.baseFound = true
  }
}

import {Element} from 'hast'
import {all} from '../all'
import {H} from '../types'

export function strong(h: H, node: Element) {
  const strong = h.textProps.strong
  h.textProps.strong = true
  const result = all(h, node)
  h.textProps.strong = strong

  return result
}

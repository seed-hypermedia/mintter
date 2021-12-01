import {Element} from 'hast'
import {all} from '../all'
import {H} from '../types'

export function strong(h: H, node: Element) {
  let strong = h.textProps.strong
  h.textProps.strong = true
  let result = all(h, node)
  h.textProps.strong = strong

  return result
}

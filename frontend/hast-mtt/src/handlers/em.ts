import {Element} from 'hast'
import {all} from '../all'
import {H} from '../types'

export function em(h: H, node: Element) {
  let emphasis = h.textProps.emphasis
  h.textProps.emphasis = true
  let result = all(h, node)
  h.textProps.emphasis = emphasis

  return result
}

import {Element} from 'hast'
import {all} from '../all'
import {H} from '../types'

export function underline(h: H, node: Element) {
  let underline = h.textProps.underline
  h.textProps.underline = true
  let result = all(h, node)
  h.textProps.underline = underline

  return result
}

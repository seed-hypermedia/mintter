import {Element} from 'hast'
import {all} from '../all'
import {H} from '../types'

export function strikethrough(h: H, node: Element) {
  const strikethrough = h.textProps.strikethrough
  h.textProps.strikethrough = true
  const result = all(h, node)
  h.textProps.strikethrough = strikethrough

  return result
}

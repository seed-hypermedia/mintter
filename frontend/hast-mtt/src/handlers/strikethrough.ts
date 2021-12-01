import {Element} from 'hast'
import {all} from '../all'
import {H} from '../types'

export function strikethrough(h: H, node: Element) {
  let strikethrough = h.textProps.strikethrough
  h.textProps.strikethrough = true
  let result = all(h, node)
  h.textProps.strikethrough = strikethrough

  return result
}

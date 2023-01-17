import {Element} from 'hast'
import {all} from '../all'
import {H} from '../types'

export function inlineCode(h: H, node: Element) {
  // eslint-disable-next-line
  const {code, ...others} = h.textProps
  h.textProps.code = true
  const result = all(h, node)
  h.textProps = others

  return result
}

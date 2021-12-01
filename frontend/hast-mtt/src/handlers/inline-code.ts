import {Element} from 'hast'
import {all} from '../all'
import {H} from '../types'

export function inlineCode(h: H, node: Element) {
  let {code, ...others} = h.textProps
  h.textProps.code = true
  let result = all(h, node)
  h.textProps = others

  return result
}

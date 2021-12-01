import {all} from '../all'
import {H} from '../types'

export function span(h: H, node: any) {
  return node.children.length == 1 ? node.children[0] : all(h, node)
}

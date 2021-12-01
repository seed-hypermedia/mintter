import {all} from '../all'
import {H, HastNode} from '../types'

export function p(h: H, node: HastNode) {
  const nodes = all(h, node)

  if (nodes.length > 0) {
    return h(node, 'paragraph', nodes)
  }
}

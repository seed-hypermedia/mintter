/**
 * @typedef {import('../types.js').Handle} Handle
 * @typedef {import('../types.js').Root} Root
 */

import {Root} from 'hast'
import {all} from '../all'
import {H} from '../types'
//  import {wrap, wrapNeeded} from '../util/wrap.js'

export function root(h: H, node: Root) {
  const children = all(h, node)

  // if (h.document || wrapNeeded(children)) {
  //   children = wrap(children)
  // }

  return h(node, 'root', children)
}

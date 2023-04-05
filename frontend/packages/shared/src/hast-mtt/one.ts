import {all} from './all'
import {H, Handle, HastNode} from './types'
import {filterProps} from './util/filter-props'
import {wrapText} from './util/wrap-text'

const own = {}.hasOwnProperty

// eslint-disable-next-line
export function one(h: H, node: any, parent?: HastNode) {
  let fn: Handle | undefined

  if (node.type == 'element') {
    if (node.properties && node.properties.dataMdast === 'ignore') {
      return
    }

    if (own.call(h.handlers, node.tagName)) {
      fn = h.handlers[node.tagName]
    }
  } else if (own.call(h.handlers, node.type)) {
    fn = h.handlers[node.type]
  }

  if (typeof fn == 'function') {
    return fn(h, node, parent)
  }

  return unknown(h, node)
}

// eslint-disable-next-line
function unknown(h: H, node: any): any {
  if (typeof node.value == 'string') {
    // get all textProps that are true in `h`
    return h(node, 'text', filterProps(h.textProps), wrapText(h, node.value))
  }

  return all(h, node)
}

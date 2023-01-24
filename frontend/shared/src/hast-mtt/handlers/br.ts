import {Element} from 'hast'
import {H} from '../types'
import {filterProps} from '../util/filter-props'

export function br(h: H, node: Element) {
  return h(node, 'text', filterProps(h.textProps), '\n')
}

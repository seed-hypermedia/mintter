import {H} from '../types'
import {filterProps} from '../util/filter-props'
import {wrapText} from '../util/wrap-text'

// eslint-disable-next-line
export function text(h: H, node: any) {
  return h(node, 'text', filterProps(h.textProps), wrapText(h, node.value))
}

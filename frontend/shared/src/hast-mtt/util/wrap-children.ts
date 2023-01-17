import {all} from '../all'
import {H, HastNode} from '../types'
import {wrap} from './wrap'

export function wrapChildren(h: H, node: HastNode) {
  return wrap(all(h, node))
}

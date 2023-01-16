import {u} from 'unist-builder'
import {visit} from 'unist-util-visit'
import {MttastNode} from '../../types'

// eslint-disable-next-line
export function unwrap<T = any>(nodes: Array<MttastNode>, type: any): Array<T> {
  const values: Array<T> = []

  visit(u('root', nodes), type, visitor)

  // eslint-disable-next-line
  function visitor(node: any): void {
    values.push(node)
  }
  return values
}

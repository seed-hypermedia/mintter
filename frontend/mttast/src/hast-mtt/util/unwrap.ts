import {u} from 'unist-builder'
import {visit} from 'unist-util-visit'
import {MttastNode} from '../..'

export function unwrap<T = any>(nodes: Array<MttastNode>, type: any): Array<T> {
  const values: Array<T> = []

  visit(u('root', nodes), type, visitor)

  function visitor(node: any): void {
    values.push(node)
  }

  return values
}

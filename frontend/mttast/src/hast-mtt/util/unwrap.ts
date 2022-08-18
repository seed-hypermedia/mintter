import {u} from 'unist-builder'
import {visit} from 'unist-util-visit'
import {MttastNode} from '../..'

export function unwrap<T = unknown>(nodes: Array<MttastNode>, type: unknown): Array<T> {
  const values: Array<T> = []

  visit(u('root', nodes), type, visitor)

  function visitor(node: unknown): void {
    values.push(node)
  }
  return values
}

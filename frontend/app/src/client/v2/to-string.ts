import {MttastNode} from '@mintter/mttast'

export function toString(node: MttastNode, separator = ''): string {
  let index = -1

  if (!node || (!Array.isArray(node) && !node.type)) {
    throw new Error(`Expected node, not ' ${node} '`)
  }

  if (typeof node.value == 'string') return node.value

  const children = (Array.isArray(node) ? node : node.children) || []

  // Shortcut: This is pretty common, and a small performance win.
  if (children.length === 1 && 'value' in children[0]) {
    return children[0].value
  }

  const values: Array<string> = []

  while (++index < children.length) {
    values[index] = toString(children[index], separator)
  }

  return values.join(separator)
}

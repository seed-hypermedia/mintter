import {isText, MttastContent, Parent} from '../mttast'

export function toString(node: MttastContent, separator = ''): string {
  let index = -1

  if (!node || (!Array.isArray(node) && !node.type)) {
    throw new Error(`Expected node, not ' ${node} '`)
  }

  // @ts-ignore
  if (isText(node)) return node.value

  const children =
    (Array.isArray(node) ? node : (node as Parent).children) || []

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

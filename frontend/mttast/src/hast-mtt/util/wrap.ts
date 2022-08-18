import {isLink, isPhrasingContent, isText, MttastNode, paragraph, PhrasingContent} from '../..'

export function wrap(nodes: Array<MttastNode>) {
  return runs(nodes, onphrasing)

  function onphrasing(nodes: Array<PhrasingContent>) {
    const head = nodes[0]

    if (nodes.length === 1 && isText(head) && (head.value === ' ' || head.value === '\n')) {
      return []
    }

    return paragraph(nodes)
  }
}

function flatten(nodes: Array<MttastNode>): Array<MttastNode> {
  let flattened: Array<MttastNode> = []
  let index = -1
  let node: MttastNode

  while (++index < nodes.length) {
    node = nodes[index]

    // @ts-ignore
    if (isLink(node) && wrapNeeded(node.children)) {
      flattened = flattened.concat(split(node))
    } else {
      flattened.push(node)
    }
  }

  return flattened
}

function runs(
  nodes: Array<MttastNode>,
  onphrasing: (nodes: Array<PhrasingContent>) => MttastNode | Array<MttastNode>,
  onnonphrasing?: (node: MttastNode) => MttastNode,
): Array<MttastNode> {
  const nonphrasing = onnonphrasing || identity
  const flattened = flatten(nodes)
  let result: Array<MttastNode> = []
  let index = -1
  let queue: Array<PhrasingContent> | undefined
  let node: MttastNode

  while (++index < flattened.length) {
    node = flattened[index]

    if (isPhrasingContent(node)) {
      if (!queue) queue = []
      queue.push(node)
    } else {
      if (queue) {
        result = result.concat(onphrasing(queue))
        queue = undefined
      }

      result = result.concat(nonphrasing(node))
    }
  }

  if (queue) {
    result = result.concat(onphrasing(queue))
  }

  return result
}

function split(node: MttastNode) {
  // @ts-expect-error Assume parent.
  return runs(node.children, onphrasing, onnonphrasing)

  /**
   * Use `child`, add `parent` as its first child, put the original children
   * into `parent`.
   * If `child` is not a parent, `parent` will not be added.
   *
   */
  function onnonphrasing(child: MttastNode): MttastNode {
    if ('children' in child && 'children' in node) {
      // eslint-disable-next-line
      const {children, ...rest} = node
      return {
        ...child,
        // @ts-expect-error: assume matching parent & child.
        children: [{...rest, children: child.children}],
      }
    }

    return {...child}
  }
}

export function wrapNeeded(nodes: Array<MttastNode>): boolean {
  let index = -1
  let node: MttastNode

  while (++index < nodes.length) {
    node = nodes[index]

    // @ts-ignore
    if (!isPhrasingContent(node) || ('children' in node && wrapNeeded(node.children))) {
      return true
    }
  }

  return false
}

function identity(n: unknown) {
  return n
}

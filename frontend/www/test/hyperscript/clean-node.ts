export function cleanNode(node) {
  delete node.__self
  delete node.__source

  if (node.children) {
    node.children = node.children.map(cleanNode)
  }
  return node
}

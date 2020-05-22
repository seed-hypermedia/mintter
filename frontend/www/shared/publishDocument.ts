import {Node} from 'slate'
import {parseToMarkdown} from './parseToMarkdown'

export function publish(slateTree: Node[]) {
  const content = parseSlatetree(slateTree)
  return content
}

export function parseSlatetree(slateTree: Node[]) {
  // TODO: (horacio) Fixme types
  return slateTree.map((section: any) => {
    const {children, ...rest} = section

    return {
      ...rest,
      body: children.map(parseToMarkdown).join(''),
    }
  })
}

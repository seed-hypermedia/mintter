import {Node} from 'slate'
import {parseToMarkdown} from './parseToMarkdown'

export function publish(slateTree: Node[]) {
  const content = parseSlatetree(slateTree)
  return content
}

export function parseSlatetree(slateTree: Node[]) {
  return slateTree.map(section => {
    const {children, ...rest} = section

    return {
      ...rest,
      body: children.map(parseToMarkdown).join(''),
    }
  })
}

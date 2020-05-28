import {Node} from 'slate'
import {parseToMarkdown} from './parseToMarkdown'
import {publishDraft} from './drafts'

export async function publish(slateTree, draftId) {
  const content = parseSlatetree(slateTree.sections)

  return await publishDraft({
    id: draftId,
    title: slateTree.title,
    description: slateTree.description,
    sections: content,
  })
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

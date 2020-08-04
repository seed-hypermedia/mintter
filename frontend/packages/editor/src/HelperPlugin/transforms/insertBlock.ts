import {
  // Transforms,
  Editor,
  // Path,
  Transforms,
} from 'slate'
import {ELEMENT_BLOCK, ELEMENT_IMAGE} from '../../elements'
// import {isCollapsed} from '@udecode/slate-plugins'
import {HelperOptionsNodeData} from '../useHelper'
import {v4 as uuid} from 'uuid'

export const insertBlock = (editor: Editor, block: HelperOptionsNodeData) => {
  Transforms.delete(editor, {unit: 'line', reverse: true})

  const parentBlock = Editor.above(editor, {
    match: n => n.type === ELEMENT_BLOCK,
  })

  if (parentBlock) {
    const [, blockPath] = parentBlock
    // const next = Path.next(blockPath)

    switch (block.type) {
      case ELEMENT_IMAGE:
        const url = block.url || ''
        const text = {text: ''}

        Transforms.insertNodes(
          editor,
          {
            type: ELEMENT_IMAGE,
            id: uuid(),
            url,
            children: [text],
          },
          {at: blockPath},
        )
        return
      case ELEMENT_BLOCK:
        return
    }
  }
}

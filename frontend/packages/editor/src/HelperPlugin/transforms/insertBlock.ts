import {
  // Transforms,
  Editor,
  // Path,
  Range,
  Transforms,
} from 'slate'
import {ELEMENT_BLOCK, ELEMENT_IMAGE, ELEMENT_H1} from '../../elements'
// import {isCollapsed} from '@udecode/slate-plugins'
import {HelperOptionsNodeData} from '../useHelper'

export const insertBlock = (
  editor: Editor,
  block: HelperOptionsNodeData,
  targetRange: Range,
  options?: any,
) => {
  console.log('props => ', {options, block, targetRange})

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
            url,
            children: [text],
          },
          {at: blockPath},
        )
        return
      case ELEMENT_BLOCK:
        return

      case ELEMENT_H1:
        Transforms.setNodes(editor, {type: block.type})
        return
    }
  }
}

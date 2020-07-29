import {
  Editor,
  Transforms,
  // Path,
  Range,
} from 'slate'
import {
  ELEMENT_BLOCK,
  // ELEMENT_PARAGRAPH,
  ELEMENT_IMAGE,
} from '../../elements'
import {isCollapsed} from '@udecode/slate-plugins'
import {HelperOptionsNodeData} from '../useHelper'

export const insertBlock = (
  editor: Editor,
  block: HelperOptionsNodeData,
  targetRange: Range,
  options?: any,
) => {
  console.log('props => ', {options, block, targetRange})

  const parentBlock = Editor.above(editor, {
    match: n => [ELEMENT_BLOCK, ELEMENT_IMAGE].includes(n.type as string),
    ...options,
  }) as any
  if (editor.selection) {
    const [parentNode, parentPath] = Editor.parent(editor, editor.selection)
    console.log('parentNode, parentPath', parentNode, parentPath)

    if (parentBlock) {
      const [blockNode, blockPath] = parentBlock
      console.log('blockNode, blockPath', blockNode, blockPath)

      console.log('isCollapsed(targetRange)', isCollapsed(targetRange))
      if (!isCollapsed(targetRange)) {
        Transforms.delete(editor)
      }
    } else {
      console.log('==== no parent node ====')
    }

    // if (blockNode.type === ELEMENT_BLOCK) {
    //   if (!isCollapsed(editor.selection)) {
    //     Transforms.delete(editor)
    //   }

    //   let newBlock

    //   switch (block.type) {
    //     case ELEMENT_IMAGE:
    //       newBlock = {
    //         type: ELEMENT_IMAGE,
    //         url: '',
    //         children: [{text: ''}],
    //       }
    //       break
    //     default:
    //       newBlock = {
    //         type: ELEMENT_BLOCK,
    //         children: [{type: ELEMENT_PARAGRAPH, children: [{text: ''}]}],
    //       }
    //       break
    //   }

    //   const nextBlockPath = Path.next(blockPath)
    //   console.log('============== nextBlockPath', nextBlockPath)
    //   Transforms.insertNodes(editor, newBlock, {at: nextBlockPath})
    //   Transforms.delete(editor, {at: blockPath})
    //   // Transforms.setNodes(editor, newBlock, {at: nextBlockPath})
    //   Transforms.move(editor)
    // }
  }
}

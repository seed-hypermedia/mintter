import {Editor} from 'slate'
import {isNodeTypeIn, isRangeAtRoot} from '@udecode/slate-plugins'

/**
 * Is the selection in block>p.
 * If true, return the node entries.
 */
export const isSelectionInBlockItem = (editor: Editor, options?: any) => {
  const {p, block} = options

  if (
    editor.selection &&
    isNodeTypeIn(editor, block.type) &&
    !isRangeAtRoot(editor.selection)
  ) {
    const [paragraphNode, paragraphPath] = Editor.parent(
      editor,
      editor.selection,
    )
    if (paragraphNode.type !== p.type) return
    const [blockNode, blockPath] = Editor.parent(editor, paragraphPath)
    if (blockNode.type !== block.type) return
    const [blockListNode, blockListPath] = Editor.parent(editor, blockPath)

    return {
      blockListNode,
      blockListPath,
      blockNode,
      blockPath,
    }
  }

  return null
}

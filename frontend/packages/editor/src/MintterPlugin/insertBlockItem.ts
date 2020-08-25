import {Editor, Path, Range, Transforms} from 'slate'
import {
  getAboveByType,
  isBlockTextEmptyAfterSelection,
  isRangeAtRoot,
} from '@udecode/slate-plugins'

/**
 * Insert list item if selection in li>p.
 */
export const insertBlockItem = (editor: Editor, options: any) => {
  const {p, block} = options

  if (editor.selection && !isRangeAtRoot(editor.selection)) {
    const paragraphEntry = getAboveByType(editor, p.type)
    if (!paragraphEntry) return
    const [, paragraphPath] = paragraphEntry

    const [blockNode, blockPath] = Editor.parent(editor, paragraphPath)
    if (blockNode.type !== block.type) return

    if (!Range.isCollapsed(editor.selection)) {
      Transforms.delete(editor)
    }

    const isStart = Editor.isStart(
      editor,
      editor.selection.focus,
      paragraphPath,
    )
    const isEnd = isBlockTextEmptyAfterSelection(editor)

    const nextParagraphPath = Path.next(paragraphPath)
    const nextblockPath = Path.next(blockPath)

    /**
     * If start, insert a list item before
     */
    if (isStart) {
      Transforms.insertNodes(
        editor,
        {
          type: block.type,
          children: [{type: p.type, children: [{text: ''}]}],
        },
        {at: blockPath},
      )
      return true
    }

    /**
     * If not end, split nodes, wrap a list item on the new paragraph and move it to the next list item
     */
    if (!isEnd) {
      Transforms.splitNodes(editor, {at: editor.selection})
      Transforms.wrapNodes(
        editor,
        {
          type: block.type,
          children: [],
        },
        {at: nextParagraphPath},
      )
      Transforms.moveNodes(editor, {
        at: nextParagraphPath,
        to: nextblockPath,
      })
    } else {
      /**
       * If end, insert a list item after and select it
       */
      Transforms.insertNodes(
        editor,
        {
          type: block.type,
          children: [{type: p.type, children: [{text: ''}]}],
        },
        {at: nextblockPath},
      )
      Transforms.select(editor, nextblockPath)
    }

    /**
     * If there is a list in the list item, move it to the next list item
     */
    if (blockNode.children.length > 1) {
      Transforms.moveNodes(editor, {
        at: nextParagraphPath,
        to: nextblockPath.concat(1),
      })
    }

    return true
  }

  return null
}

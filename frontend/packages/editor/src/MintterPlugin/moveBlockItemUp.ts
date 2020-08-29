import {Ancestor, Editor, Path, Transforms} from 'slate'
import {v4 as uuid} from 'uuid'
/**
 * Move a block next to its parent.
 * The parent should be a block list.
 */
export const moveBlockItemUp = (
  editor: Editor,
  blockListNode: Ancestor,
  blockLiatPath: number[],
  blockPath: number[],
  options: any,
) => {
  const {block} = options

  const [blockListParentNode, blockListParentPath] = Editor.parent(
    editor,
    blockLiatPath,
  )
  if (blockListParentNode.type !== block.type) return

  const newBlockItemPath = Path.next(blockListParentPath)

  // Move item one level up
  Transforms.moveNodes(editor, {
    at: blockPath,
    to: newBlockItemPath,
  })

  /**
   * Move the next siblings to a new list
   */
  const blockItemIndex = blockPath[blockPath.length - 1]
  const siblingPath = [...blockPath]
  const newBlockListPath = newBlockItemPath.concat(1)
  let siblingFound = false
  let newSiblingIdx = 0
  blockListNode.children.forEach((n, idx) => {
    console.log('n', n)
    if (blockItemIndex < idx) {
      if (!siblingFound) {
        siblingFound = true

        Transforms.insertNodes(
          editor,
          {
            type: blockListNode.type,
            id: uuid(),
            children: [],
          },
          {at: newBlockListPath},
        )
      }

      siblingPath[siblingPath.length - 1] = blockItemIndex
      const newSiblingsPath = newBlockListPath.concat(newSiblingIdx)
      newSiblingIdx++
      Transforms.moveNodes(editor, {
        at: siblingPath,
        to: newSiblingsPath,
      })
    }
  })

  // Remove sublist if it was the first list item
  if (!blockItemIndex) {
    Transforms.removeNodes(editor, {
      at: blockLiatPath,
    })
  }

  return true
}

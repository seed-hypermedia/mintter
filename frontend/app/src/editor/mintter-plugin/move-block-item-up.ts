import {Ancestor, Editor, Path, Transforms} from 'slate'
import {id} from '../id'
/**
 * Move a block next to its parent.
 * The parent should be a block list.
 */
export const moveBlockItemUp = (
  editor: Editor,
  blockListNode: Ancestor,
  blockListPath: number[],
  blockPath: number[],
  options: any,
) => {
  const {block} = options

  const [blockListParentNode, blockListParentPath] = Editor.parent(
    editor,
    blockListPath,
  )

  if (blockListParentNode.type !== block.type) return // is not a subList

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
  blockListNode.children.forEach((_n, idx) => {
    if (blockItemIndex < idx) {
      if (!siblingFound) {
        siblingFound = true

        Transforms.insertNodes(
          editor,
          {
            type: blockListNode.type,
            id: id(),
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
      at: blockListPath,
    })
  }

  return true
}

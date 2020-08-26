import {Editor, Element, Ancestor, Path, NodeEntry, Transforms} from 'slate'
import {isFirstChild} from '@udecode/slate-plugins'
import {isSelectionInBlockItem} from '../MintterPlugin/isSelectionInBlockItem'
import {moveBlockItemUp} from '../MintterPlugin/moveBlockItemUp'

export const onKeyDownHierarchy = options => (
  e: KeyboardEvent,
  editor: Editor,
) => {
  let moved: boolean | undefined = false
  if (e.key === 'Tab') {
    const res = isSelectionInBlockItem(editor, options)
    if (!res) return
    const {blockListNode, blockListPath, blockPath} = res

    e.preventDefault()

    const shiftTab = e.shiftKey
    if (shiftTab) {
      // move outside with shift+tab
      moved = moveBlockItemUp(
        editor,
        blockListNode,
        blockListPath,
        blockPath,
        options,
      )
      if (moved) e.preventDefault()
    }

    const tab = !e.shiftKey
    if (tab && !isFirstChild(blockPath)) {
      moveBlockListDown(editor, blockListNode, blockPath, options)
    }
  }
}

export const moveBlockListDown = (
  editor: Editor,
  blockListNode: Ancestor,
  blockPath: number[],
  options?: any,
) => {
  // Previous sibling is the new parent
  const previousSiblingItem = Editor.node(
    editor,
    Path.previous(blockPath),
  ) as NodeEntry<Ancestor>

  if (previousSiblingItem) {
    const [previousNode, previousPath] = previousSiblingItem

    const sublist = previousNode.children.find(isBlockList(options)) as
      | Element
      | undefined
    const newPath = previousPath.concat(
      sublist ? [1, sublist.children.length] : [1],
    )

    if (!sublist) {
      // Create new sublist
      Transforms.wrapNodes(
        editor,
        {type: blockListNode.type, children: []},
        {at: blockPath},
      )
    }

    // Move the current item to the sublist
    Transforms.moveNodes(editor, {
      at: blockPath,
      to: newPath,
    })
  }
}

export const isBlockList = (options?: any) => (n: any) => {
  const {block_list} = options

  return [block_list.type].includes(n.type as string)
}

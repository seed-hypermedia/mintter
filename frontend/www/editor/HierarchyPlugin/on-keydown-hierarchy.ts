import {Editor, Element, Ancestor, Path, NodeEntry, Transforms} from 'slate'
import {isFirstChild} from '@udecode/slate-plugins'
import {
  getBlockItemEntry,
  isSelectionInBlockItem,
  isSelectionInTransclusion,
} from '../MintterPlugin/isSelectionInBlockItem'
import {moveBlockItemUp} from '../MintterPlugin/moveBlockItemUp'
import {id} from '../id'

export const onKeyDownHierarchy = options => (
  e: KeyboardEvent,
  editor: Editor,
) => {
  let moved: boolean | undefined = false
  if (e.key === 'Tab') {
    console.log(
      'getBlockItemEntry',
      getBlockItemEntry({editor, locationOptions: {}, options}),
    )

    let res = isSelectionInBlockItem(editor, options)
    if (!res) {
      res = isSelectionInTransclusion(editor, options)
    }

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

    Editor.withoutNormalizing(editor, () => {
      if (!sublist) {
        // Create new sublist
        Transforms.wrapNodes(
          editor,
          {type: blockListNode.type, id: id(), children: []},
          {at: blockPath},
        )
      }

      Transforms.moveNodes(editor, {
        at: blockPath,
        to: newPath,
      })
    })
  }
}

export const isBlockList = (options?: any) => (n: any) => {
  const {block_list} = options

  return [block_list.type].includes(n.type as string)
}

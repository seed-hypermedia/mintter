import {Editor, Transforms} from 'slate'
import {ReactEditor} from 'slate-react'
import {
  isBlockAboveEmpty,
  isSelectionAtBlockStart,
  onKeyDownResetBlockType,
} from '@udecode/slate-plugins'
import {insertBlockItem} from './insertBlockItem'
import {moveBlockItemUp} from './moveBlockItemUp'
import {
  isSelectionInBlockItem,
  isSelectionInTransclusion,
} from './isSelectionInBlockItem'
import {unwrapBlockList} from './unwrapBlockList'

export const withMintter = options => <T extends ReactEditor>(editor: T) => {
  const {p, block} = options
  const {insertBreak, deleteBackward} = editor

  const resetBlockTypesListRule = {
    types: [block.type],
    defaultType: p.type,
    onReset: (_editor: Editor) => unwrapBlockList(_editor, options),
  }

  editor.insertBreak = () => {
    let res = isSelectionInBlockItem(editor, options)

    let moved: boolean | undefined
    if (res && isBlockAboveEmpty(editor)) {
      const {blockListNode, blockListPath, blockPath} = res
      moved = moveBlockItemUp(
        editor,
        blockListNode,
        blockListPath,
        blockPath,
        options,
      )
      console.log('editor.insertBreak -> moved', moved)

      if (moved) return

      if (blockListPath.length === 1) {
        // blockList is first level
        return
      }
    }

    const didReset = onKeyDownResetBlockType({
      rules: [
        {
          ...resetBlockTypesListRule,
          predicate: () => !moved && isBlockAboveEmpty(editor),
        },
      ],
    })(null, editor)
    if (didReset) return

    /**
     * Add a new list item if selection is in a LIST_ITEM > p.type.
     */
    if (!moved) {
      console.log('moved  IS VALID')
      const inserted = insertBlockItem(editor, options)
      if (inserted) return
    }

    insertBreak()
  }

  editor.deleteBackward = unit => {
    let res = isSelectionInBlockItem(editor, options)

    if (!res) {
      res = isSelectionInTransclusion(editor, options)
    }

    let moved: boolean | undefined
    if (res && isSelectionAtBlockStart(editor)) {
      const {blockListNode, blockListPath, blockNode, blockPath} = res

      moved = moveBlockItemUp(
        editor,
        blockListNode,
        blockListPath,
        blockPath,
        options,
      )
      if (moved) return

      // if blockList is length 1
      if (blockListPath.length === 1) {
        // blockListPath is first level

        if (blockNode.children.length > 1) {
          // block has a blockList as child
          // move childs to the outer list
          Transforms.moveNodes(editor, {at: blockPath.concat(1), to: blockPath})
          Transforms.unwrapNodes(editor, {at: blockPath})

          Transforms.select(editor, Editor.start(editor, blockPath))
        } else {
          // block has no childs, delete!!
          if (blockListNode.children.length > 1) {
            // block is not the first Child
            Transforms.removeNodes(editor, {at: blockPath})
          }
        }

        return
      }
    }

    const didReset = onKeyDownResetBlockType({
      rules: [
        {
          ...resetBlockTypesListRule,
          predicate: () => !moved && isSelectionAtBlockStart(editor),
        },
      ],
    })(null, editor)
    console.log('didReset ==>', didReset)
    if (didReset) return

    deleteBackward(unit)
  }

  return editor
}

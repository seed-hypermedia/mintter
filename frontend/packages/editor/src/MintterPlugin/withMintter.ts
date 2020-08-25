import {Editor} from 'slate'
import {ReactEditor} from 'slate-react'
import {
  isBlockAboveEmpty,
  isSelectionAtBlockStart,
  onKeyDownResetBlockType,
  unwrapList,
} from '@udecode/slate-plugins'
import {insertBlockItem} from './insertBlockItem'
import {moveBlockItemUp} from './moveBlockItemUp'
import {isSelectionInBlockItem} from './isSelectionInBlockItem'

export const withMintter = options => <T extends ReactEditor>(editor: T) => {
  const {p, blockList} = options
  const {insertBreak, deleteBackward} = editor

  const resetBlockTypesListRule = {
    types: [blockList.type],
    defaultType: p.type,
    onReset: (_editor: Editor) => unwrapList(_editor, options),
  }

  editor.insertBreak = () => {
    const res = isSelectionInBlockItem(editor, options)

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

      if (moved) return
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
      const inserted = insertBlockItem(editor, options)
      if (inserted) return
    }

    insertBreak()
  }

  editor.deleteBackward = unit => {
    const res = isSelectionInBlockItem(editor, options)

    let moved: boolean | undefined
    if (res && isSelectionAtBlockStart(editor)) {
      const {blockListNode, blockListPath, blockPath} = res

      moved = moveBlockItemUp(
        editor,
        blockListNode,
        blockListPath,
        blockPath,
        options,
      )
      if (moved) return
    }

    const didReset = onKeyDownResetBlockType({
      rules: [
        {
          ...resetBlockTypesListRule,
          predicate: () => !moved && isSelectionAtBlockStart(editor),
        },
      ],
    })(null, editor)
    if (didReset) return

    deleteBackward(unit)
  }

  return editor
}

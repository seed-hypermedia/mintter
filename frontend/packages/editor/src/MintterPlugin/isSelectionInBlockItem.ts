import {Editor, Location} from 'slate'
import {
  getAboveByType,
  getParent,
  isNodeTypeIn,
  setDefaults,
} from '@udecode/slate-plugins'
import {isRangeAtRoot} from '../isRangeAtRoot'
import {DEFAULTS_BLOCK} from '../BlockPlugin/defaults'

type LocationOptions = {
  at?: Location | null
}

type EntryTypes = {
  editor: Editor
  locationOptions?: LocationOptions
  options?: any
}

export const getBlockItemEntry = ({
  editor,
  locationOptions: {at = editor.selection} = {},
  options,
}: EntryTypes) => {
  const {block} = setDefaults(options, DEFAULTS_BLOCK)

  if (at && isNodeTypeIn(editor, block.type, {at})) {
    const selectionParent = getParent(editor, at)
    if (!selectionParent) return
    const [, paragraphPath] = selectionParent

    const blockItem =
      getAboveByType(editor, block.type, {at}) ||
      getParent(editor, paragraphPath)

    if (!blockItem) return
    const [blockItemNode, blockItemPath] = blockItem

    if (blockItemNode.type !== block.type) return

    const blockList = getParent(editor, blockItemPath)
    if (!blockList) return

    return {
      blockList,
      blockItem,
    }
  }

  return null
}

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

  return
}

export const isSelectionInTransclusion = (editor: Editor, options?: any) => {
  const {transclusion, read_only} = options

  if (
    editor.selection &&
    isNodeTypeIn(editor, transclusion.type) &&
    !isRangeAtRoot(editor.selection)
  ) {
    const [readOnlyNode, readOnlyPath] = Editor.parent(editor, editor.selection)

    if (readOnlyNode.type !== read_only.type) return
    const [transclusionNode, transclusionPath] = Editor.parent(
      editor,
      readOnlyPath,
    )

    if (transclusionNode.type !== transclusion.type) return

    const [blockListNode, blockListPath] = Editor.parent(
      editor,
      transclusionPath,
    )

    return {
      blockListNode,
      blockListPath,
      blockNode: transclusionNode,
      blockPath: transclusionPath,
    }
  }

  return
}

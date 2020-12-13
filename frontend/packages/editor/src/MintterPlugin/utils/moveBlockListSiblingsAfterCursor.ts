import {Editor, Node, NodeEntry, Path} from 'slate'
import {moveChildren} from '@udecode/slate-plugins'
import {isNodeTypeBlockList} from './isNodeTypeBlockList'

export const moveBlockListSiblingsAfterCursor = (
  editor: Editor,
  {
    at,
    to,
  }: {
    at: Path
    to: Path
  },
  options?: any,
): number => {
  const offset = at[at.length - 1]
  at = Path.parent(at)
  const listNode = Node.get(editor, at)
  const listEntry: NodeEntry = [listNode, at]

  if (
    !isNodeTypeBlockList(listNode, options) ||
    Path.isParent(at, to) // avoid moving nodes within its own list
  ) {
    return 0
  }

  return moveChildren(editor, {
    at: listEntry,
    to,
    start: offset + 1,
  })
}

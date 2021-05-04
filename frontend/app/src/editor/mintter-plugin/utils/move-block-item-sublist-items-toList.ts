import {Ancestor, Editor, NodeEntry, Path, Transforms} from 'slate'
import {getLastChildPath, moveChildren} from '@udecode/slate-plugins'
import {getBlockItemSublist} from './get-block-item-sublist'

export interface MergeBlockItemIntoListOptions {
  /**
   * List items of the sublist of this node will be moved.
   */
  fromBlockItem: NodeEntry<Ancestor>

  /**
   * List items will be moved in this list.
   */
  toList: NodeEntry<Ancestor>

  /**
   * Move to the start of the list instead of the end.
   */
  start?: boolean
}

/**
 * Move the list items of the sublist of `fromBlockItem` to `toList`.
 */
export const moveBlockItemSublistItemsToList = (
  editor: Editor,
  {fromBlockItem, toList, start}: MergeBlockItemIntoListOptions,
) => {
  const fromBlockItemSublist = getBlockItemSublist(fromBlockItem)
  if (!fromBlockItemSublist) return 0

  const [, fromBlockItemSublistPath] = fromBlockItemSublist
  const lastChildPath = getLastChildPath(toList)

  const moved = moveChildren(editor, {
    at: fromBlockItemSublistPath,
    to: start ? toList[1].concat([0]) : Path.next(lastChildPath),
  })

  // Remove the empty list
  Transforms.delete(editor, {at: fromBlockItemSublistPath})

  return moved
}

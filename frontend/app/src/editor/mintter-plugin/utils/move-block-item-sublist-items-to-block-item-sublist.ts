import {
  getLastChildPath,
  getParent,
  moveChildren,
} from '@udecode/slate-plugins';
import { Ancestor, Editor, NodeEntry, Path, Transforms } from 'slate';

import { getBlockItemSublist } from './get-block-item-sublist';

export interface MoveBlockItemSublistItemsToBlockItemSublistOptions {
  /**
   * The list item to merge.
   */
  fromBlockItem: NodeEntry<Ancestor>;

  /**
   * The list item where to merge.
   */
  toBlockItem: NodeEntry<Ancestor>;

  /**
   * Move to the start of the list instead of the end.
   */
  start?: boolean;
}

/**
 * Move fromListItem sublist list items to the end of `toListItem` sublist.
 * If there is no `toListItem` sublist, insert one.
 */
export const moveBlockItemSublistItemsToBlockItemSublist = (
  editor: Editor,
  {
    fromBlockItem,
    toBlockItem,
    start,
  }: MoveBlockItemSublistItemsToBlockItemSublistOptions,
) => {
  const [, fromBlockItemPath] = fromBlockItem;
  const [, toBlockItemPath] = toBlockItem;

  const fromBlockItemSublist = getBlockItemSublist(fromBlockItem);
  if (!fromBlockItemSublist) return 0;
  const [, fromBlockItemSublistPath] = fromBlockItemSublist;

  const toBlockItemSublist = getBlockItemSublist(toBlockItem);

  let to: Path;

  if (!toBlockItemSublist) {
    const fromList = getParent(editor, fromBlockItemPath);
    if (!fromList) return 0;
    const [fromListNode] = fromList;

    const fromlistStyle = fromListNode.type;

    const toBlockItemSublistPath = toBlockItemPath.concat([1]);

    Transforms.insertNodes(
      editor,
      { type: fromlistStyle, children: [] },
      { at: toBlockItemSublistPath },
    );

    to = toBlockItemSublistPath.concat([0]);
  } else if (start) {
    const [, toBlockItemSublistPath] = toBlockItemSublist;
    to = toBlockItemSublistPath.concat([0]);
  } else {
    to = Path.next(getLastChildPath(toBlockItemSublist));
  }

  const moved = moveChildren(editor, {
    at: fromBlockItemSublistPath,
    to,
  });

  // Remove the empty list
  Transforms.delete(editor, { at: fromBlockItemSublistPath });

  return moved;
};

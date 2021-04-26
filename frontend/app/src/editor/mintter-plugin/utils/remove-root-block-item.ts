import {
  getPreviousPath,
  isExpanded,
  ListOptions,
} from '@udecode/slate-plugins';
import { Ancestor, Editor, NodeEntry, Transforms } from 'slate';

import { hasListInBlockItem } from './has-list-in-block-item';
import { moveBlockItemSublistItemsToBlockItemSublist } from './move-block-item-sublist-items-to-block-item-sublist';
import { moveBlockItemSublistItemsToList } from './move-block-item-sublist-items-toList';

export interface RemoveListItemOptions {
  blockList: NodeEntry<Ancestor>;
  blockItem: NodeEntry<Ancestor>;
}

/**
 * Remove list item and move its sublist to list if any.
 * TODO: handle expanded selection
 * TODO: move p children in the previous list item if any
 */
export const removeRootListItem = (
  editor: Editor,
  { blockList, blockItem }: RemoveListItemOptions,
  options?: ListOptions,
) => {
  const [blockItemNode, blockItemPath] = blockItem;

  if (!hasListInBlockItem(blockItemNode, options)) {
    // No sub-lists to move over
    return false;
  }

  if (isExpanded(editor.selection)) {
    return false;
  }

  const blockItemPathRef = Editor.pathRef(editor, blockItemPath);
  const previousBlockItemPath = getPreviousPath(blockItemPath);

  if (previousBlockItemPath) {
    const [previousBlockItemNode] = Editor.node(editor, previousBlockItemPath);

    // We may have a trailing sub-list
    // that we need to merge backwards
    moveBlockItemSublistItemsToBlockItemSublist(editor, {
      fromBlockItem: blockItem,
      toBlockItem: [previousBlockItemNode as Ancestor, previousBlockItemPath],
    });

    // Select the P tag at the previous list item
    Transforms.select(
      editor,
      Editor.end(editor, previousBlockItemPath.concat([0])),
    );
  } else {
    // We may have a trailing sub-list that we
    // need to move into the root list
    moveBlockItemSublistItemsToList(editor, {
      fromBlockItem: blockItem,
      toList: blockList,
      // start: true,
    });
  }

  // Remove the list-item
  const blockItemPathUnref = blockItemPathRef.unref();
  if (blockItemPathUnref) {
    Transforms.removeNodes(editor, { at: blockItemPathUnref });
  }

  return true;
};

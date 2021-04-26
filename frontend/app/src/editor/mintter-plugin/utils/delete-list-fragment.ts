import { getLastChildPath, getNode, setDefaults } from '@udecode/slate-plugins';
import { Ancestor, Editor, Node, Path, Range, Transforms } from 'slate';

import { DEFAULTS_BLOCK } from '../../block-plugin/defaults';
import { getBlockItemEntry } from '../is-selection-in-block-item';
import { getBlockItemSublist } from './get-block-item-sublist';
import { getListRoot } from './get-list-root';
import { moveBlockItemSublistItemsToBlockItemSublist } from './move-block-item-sublist-items-to-block-item-sublist';
import { moveBlockItemSublistItemsToList } from './move-block-item-sublist-items-toList';
import { moveBlockListSiblingsAfterCursor } from './move-blocklist-siblings-after-cursor';

export const deleteListFragment = (
  editor: Editor,
  selection: Range,
  options: any = {},
): number | undefined => {
  const [startSelection, endSelection] = Range.edges(selection);
  // Selection should contain multiple blocks.
  if (Path.equals(startSelection.path, endSelection.path)) return;

  const root = getListRoot(editor, endSelection, options);

  // End selection should be in a list.
  if (!root) return;

  const [rootNode, rootPath] = root;
  const { block } = setDefaults(options, DEFAULTS_BLOCK);
  let moved = 0;

  Editor.withoutNormalizing(editor, () => {
    const listEnd = getBlockItemEntry({
      editor,
      locationOptions: { at: endSelection },
      options,
    });
    // End selection should be in a list item.
    if (!listEnd) return;

    let next: Path;
    let childrenMoved = 0;
    const { blockItem: blockItemEnd } = listEnd;

    if (Path.isBefore(startSelection.path, rootPath)) {
      // If start selection is before the root list.
      next = Path.next(rootPath);
      // Copy the root list after it.
      Transforms.insertNodes(
        editor,
        {
          type: rootNode.type,
          children: [],
        },
        { at: next },
      );

      const toListNode = getNode(editor, next);
      if (!toListNode) return 0;

      childrenMoved = moveBlockItemSublistItemsToList(editor, {
        fromBlockItem: blockItemEnd,
        toList: [toListNode as Ancestor, next],
      });

      // next is the first list item of the root copy.
      next = [...next, 0];
    } else {
      // If start selection is inside the root list.

      // Find the first list item that will not be deleted.
      const listStart = getBlockItemEntry({
        editor,
        locationOptions: { at: startSelection },
        options,
      });
      if (!listStart) return;

      const { blockItem: blockItemStart } = listStart;
      const listItemSublist = getBlockItemSublist(blockItemStart, options);

      childrenMoved = moveBlockItemSublistItemsToBlockItemSublist(editor, {
        fromBlockItem: blockItemEnd,
        toBlockItem: blockItemStart,
      });
      next = listItemSublist
        ? Path.next(getLastChildPath(listItemSublist))
        : blockItemStart[1].concat([1, 0]);
    }

    // Move siblings outside of deleted fragment
    let cursorPath = endSelection.path;
    let siblingsMoved = 0;
    next = [...next.slice(0, -1), next[next.length - 1] + childrenMoved];
    while (Path.isAfter(cursorPath, startSelection.path)) {
      const node = Node.get(editor, cursorPath);
      if (node.type === block.type) {
        siblingsMoved += moveBlockListSiblingsAfterCursor(
          editor,
          { at: cursorPath, to: next },
          options,
        );
      }
      cursorPath = Path.parent(cursorPath);
    }

    // Move done. We can delete the fragment.
    Transforms.delete(editor, { at: selection });

    moved = siblingsMoved + childrenMoved;
  });

  return moved;
};

import { NodeEntry, Ancestor, Editor, Transforms, Path } from 'slate';
import { isFirstChild, moveChildren } from '@udecode/slate-plugins';
import { hasListInBlockItem } from './has-list-in-block-item';
import { isBlockListNested } from './is-blocklist-nested';

// TODO: fix types
export const removeFirstBlockItem = (
  editor: Editor,
  {
    blockList,
    blockItem,
  }: {
    blockList: NodeEntry<Ancestor>;
    blockItem: NodeEntry<Ancestor>;
  },
  options: any,
) => {
  const [listNode, listPath] = blockList;
  const [itemNode, itemPath] = blockItem;

  if (
    !isBlockListNested(editor, listPath, options) &&
    listNode.children.length <= 1 &&
    hasListInBlockItem(itemNode) &&
    isFirstChild(itemPath)
  ) {
    // move all children to the container
    moveChildren(editor, {
      at: [itemNode, itemPath],
      to: Path.next(listPath),
    });
    Transforms.removeNodes(editor, { at: listPath });
    return true;
  }

  return false;
};

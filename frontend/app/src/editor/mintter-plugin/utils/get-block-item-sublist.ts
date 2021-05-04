import type { Ancestor, NodeEntry } from 'slate';
import { hasListInBlockItem } from './has-list-in-block-item';

/**
 * Get the list inside listItem if existing.
 * It assumes this structure: ul>li>p+ul
 */
export const getBlockItemSublist = (
  listItem: NodeEntry<Ancestor>,
  options?: any,
): NodeEntry<Ancestor> | undefined => {
  const [blockItemNode, blockItemPath] = listItem;

  if (hasListInBlockItem(blockItemNode, options)) {
    return [blockItemNode.children[1] as Ancestor, blockItemPath.concat([1])];
  }
};

import type { Ancestor } from 'slate';
import { isNodeTypeBlockList } from './is-nodetype-blocklist';

export const hasListInBlockItem = (blockItemNode: Ancestor, options?: any) =>
  blockItemNode.children.length > 1 &&
  isNodeTypeBlockList(blockItemNode.children[1], options);

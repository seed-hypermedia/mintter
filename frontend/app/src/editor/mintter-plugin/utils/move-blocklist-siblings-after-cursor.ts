import { Editor, Node, NodeEntry, Path, Transforms } from 'slate';
import { MoveChildrenOptions, getNode } from '@udecode/slate-plugins';
import { isNodeTypeBlockList } from './is-nodetype-blocklist';

export const moveBlockListSiblingsAfterCursor = (
  editor: Editor,
  {
    at,
    to,
  }: {
    at: Path;
    to: Path;
  },
  options?: any,
): number => {
  const offset = at[at.length - 1];
  at = Path.parent(at);
  const listNode = Node.get(editor, at);
  const listEntry: NodeEntry = [listNode, at];

  if (
    !isNodeTypeBlockList(listNode, options) ||
    Path.isParent(at, to) // avoid moving nodes within its own list
  ) {
    return 0;
  }

  return moveChildren(editor, {
    at: listEntry,
    to,
    fromStartIndex: offset + 1,
  });
};

const moveChildren = (
  editor: Editor,
  { at, to, match, fromStartIndex = 0 }: MoveChildrenOptions,
) => {
  let moved = 0;
  const parentPath = Path.isPath(at) ? at : at[1];
  const parentNode = Path.isPath(at) ? Node.get(editor, parentPath) : at[0];

  if (!Editor.isBlock(editor, parentNode)) return moved;

  for (let i = parentNode.children.length - 1; i >= fromStartIndex; i--) {
    const childPath = [...parentPath, i];
    const childNode = getNode(editor, childPath);

    if (!match || (childNode && match([childNode, childPath]))) {
      Transforms.moveNodes(editor, { at: childPath, to });
      moved++;
    }
  }

  return moved;
};

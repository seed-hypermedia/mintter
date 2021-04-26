import { isFirstChild } from '@udecode/slate-plugins';
import { Ancestor, Editor, Transforms } from 'slate';

export function removeCurrentEmptyBlock(
  editor: Editor,
  blockListNode: Ancestor,
  blockListPath: number[],
  blockPath: number[],
  options: any,
) {
  console.log('removeCurrentEmptyBlock', {
    blockListNode,
    blockListPath,
    blockPath,
    options,
  });
  const [blockListParentNode, blockListParentPath] = Editor.parent(
    editor,
    blockListPath,
  );

  if (isFirstChild(blockPath)) {
    if (
      isFirstChild(blockListPath) &&
      blockListParentNode.children.length === 1
    ) {
      // block_list is the first and only child
      console.log('block_list is the first and only child');
    } else {
      // block_list is not first or is not the only child
      console.log('block_list is not first or is not the only child', {
        blockListParentNode,
        blockListParentPath,
      });
    }
  } else {
    console.log('is NOT the first block at the list');
    Transforms.removeNodes(editor, { at: blockPath });
  }

  return true;
}

import { isSelectionInTransclusion } from '../mintter-plugin/is-selection-in-block-item';
import { Editor, NodeEntry, Path, Transforms, Ancestor } from 'slate';
import { getBlockAbove, getNextSiblingNodes } from '@udecode/slate-plugins';
import { id } from '../id';
// TODO: fix types
export const onKeyDownTransclusion = (options: any) => (
  e: KeyboardEvent,
  editor: Editor,
) => {
  if (e.key === 'Enter') {
    const res = isSelectionInTransclusion(editor, options);
    if (!res) return;
    createEmptyBlock(editor, options, res.blockPath);
    return;
  }

  if (e.key === 'ArrowDown') {
    const res = isSelectionInTransclusion(editor, options);
    if (!res) return;
    const blockAbove = getBlockAbove(editor, {
      at: res.blockPath,
    }) as NodeEntry<Ancestor>;
    const [nextBlock] = getNextSiblingNodes(blockAbove, res.blockPath);

    if (!nextBlock) {
      createEmptyBlock(editor, options, res.blockPath);
    }
  }
};

// TODO: fix types
function createEmptyBlock(editor: Editor, options: any, after: any) {
  const nextPath = Path.next(after);

  Transforms.insertNodes(
    editor,
    {
      type: options.block.type,
      id: id(),
      children: [{ type: options.p.type, children: [{ text: '' }] }],
    },
    {
      at: nextPath,
    },
  );
  Transforms.select(editor, Editor.start(editor, nextPath));
}

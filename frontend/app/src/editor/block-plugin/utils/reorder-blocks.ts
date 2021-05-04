import { Transforms } from 'slate';
import type { ReactEditor } from 'slate-react';

// TODO: fix types
export function reorderBlocks(
  editor: ReactEditor,
  { source, destination }: any,
) {
  console.log('reorderBlocks -> {source, destination}', {
    source,
    destination,
  });
  Transforms.moveNodes(editor, {
    at: [source.index],
    to: [destination.index],
  });
}

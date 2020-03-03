import { Editor, Node, Transforms } from 'slate';
import { ReactEditor } from 'slate-react';

const withBlocks = <T extends Editor>(editor: T): Editor & ReactEditor => {
  const e = editor as T & ReactEditor;
  const { normalizeNode } = e;

  e.normalizeNode = ([node, path]) => {
    if (path.length === 0) {
      // I'm in the editor node (node === editor)
      for (const [child, childPath] of Node.children(editor, path)) {
        if (childPath[0] !== 0) {
          if (child.type !== 'block') {
            Transforms.wrapNodes(
              editor,
              { type: 'block', children: [] },
              { at: childPath }
            );
          }
        }
      }

      return;
    }

    normalizeNode([node, path]);
  };
  return e;
};

export default withBlocks;

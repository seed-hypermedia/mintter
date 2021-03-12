import type { ReactEditor } from 'slate-react';
import { Editor, Transforms } from 'slate';
import { id } from '../id';
// import {ELEMENT_PARAGRAPH} from '../elements/defaults'
import { ELEMENT_TRANSCLUSION } from './defaults';
import { ELEMENT_READ_ONLY } from '../readonly-plugin/defaults';
// TODO: fix types
export const withTransclusion = (options: any) => <T extends ReactEditor>(
  editor: T,
) => {
  const e = editor as T & ReactEditor;
  const { deleteBackward } = e;

  e.deleteBackward = (unit) => {
    const { selection } = editor;

    if (selection) {
      const parent = Editor.parent(editor, selection);
      if (parent) {
        const [parentNode, parentPath] = parent;
        if (parentNode.type === ELEMENT_READ_ONLY) {
          const [blockNode, blockPath] = Editor.parent(editor, parentPath);
          if (blockNode.type === ELEMENT_TRANSCLUSION) {
            const [blockListNode] = Editor.parent(editor, blockPath);

            Editor.withoutNormalizing(editor, () => {
              Transforms.delete(editor, { at: blockPath });
              if (blockListNode.children.length === 0) {
                Transforms.insertNodes(
                  editor,
                  {
                    type: options.block.type,
                    id: id(),
                    children: [
                      { type: options.p.type, children: [{ text: '' }] },
                    ],
                  },
                  { at: blockPath },
                );
                Transforms.select(editor, blockPath);
              }
            });

            return;
          }
        }
      }
    }

    deleteBackward(unit);
  };

  return e;
};

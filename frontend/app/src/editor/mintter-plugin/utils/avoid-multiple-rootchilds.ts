import { Editor, Transforms } from 'slate';

export function avoidMultipleRootChilds(editor: Editor) {
  if (editor.children.length > 1) {
    Transforms.moveNodes(editor, { at: [0], to: [1, 0] });

    return true;
  }

  return;
}

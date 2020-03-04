import {Editor as SlateEditor, Transforms, Range} from 'slate'

export interface MintterEditor {
  removeBackslash: (editor: SlateEditor) => void
}

// TODO: fix types here
export const Editor = {
  ...SlateEditor,
  removeBackslash(editor: SlateEditor): void {
    const anchor = editor.selection?.anchor
    const block = Editor.above(editor, {
      match: n => Editor.isBlock(editor, n),
    })
    const path = block ? block[1] : []
    const start = Editor.start(editor, path)

    const range = {anchor, focus: start} as Range
    const beforeText = Editor.string(editor, range)
    if (beforeText === '/') {
      Transforms.select(editor, range)
      Transforms.delete(editor)
    }

    return
  },
}

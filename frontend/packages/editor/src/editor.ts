import {Editor as SlateEditor, Transforms} from 'slate'
import {PARAGRAPH} from 'slate-plugins-next'
import {ReactEditor} from 'slate-react'

export interface MintterEditor {}

// TODO: fix types here
export const Editor = {
  ...SlateEditor,
  addSection: (editor: ReactEditor): void => {
    const newNode = {
      type: 'section',
      children: [{type: PARAGRAPH, children: [{text: ''}]}],
    }
    const at = [editor.children.length]
    Transforms.insertNodes(editor, newNode, {at})
    ReactEditor.focus(editor)
    Transforms.select(editor, SlateEditor.end(editor, []))
  },
}

export const initialValue = [
  {
    type: 'section',
    children: [
      {
        type: PARAGRAPH,
        children: [
          {
            text: '',
          },
        ],
      },
    ],
  },
]

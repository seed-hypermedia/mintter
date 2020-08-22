import {Editor as SlateEditor, Path, Node} from 'slate'
import {ReactEditor} from 'slate-react'
import {ELEMENT_PARAGRAPH, ELEMENT_BLOCK} from './elements'

export interface MintterEditor extends ReactEditor {
  charCount: (editor: ReactEditor, path: Path) => number
}

export interface EditorState {
  title: string
  description: string
  sections: Node[]
}

export interface SlateBlock {
  id: string
  type: string
  children: Node[]
}

// TODO: fix types here
export const Editor = {
  ...SlateEditor,
  charCount: (editor: ReactEditor, path: Path): number => {
    const txt = SlateEditor.string(editor, path)
    return txt.trim().length
  },
}

export const initialBlocksValue = [
  {
    type: ELEMENT_BLOCK,
    children: [
      {
        type: ELEMENT_PARAGRAPH,
        children: [
          {
            text: '',
          },
        ],
      },
    ],
  },
]

export const initialValue: EditorState = {
  title: '',
  description: '',
  sections: initialBlocksValue,
}

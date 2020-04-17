import {Editor as SlateEditor} from 'slate'
import {PARAGRAPH} from 'slate-plugins-next'

export interface MintterEditor {}

// TODO: fix types here
export const Editor = {
  ...SlateEditor,
}

export const initialValue = [
  {
    type: PARAGRAPH,
    children: [
      {
        text: '',
      },
    ],
  },
]

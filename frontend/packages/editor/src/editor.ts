import {Editor as SlateEditor, Path, Node} from 'slate'
import {ReactEditor} from 'slate-react'
import {ELEMENT_PARAGRAPH, ELEMENT_BLOCK, ELEMENT_BLOCK_LIST} from './elements'
import {BlockRefList} from '@mintter/proto/v2/documents_pb'
import {v4 as uuid} from 'uuid'
import {ELEMENT_TRANSCLUSION} from './TransclusionPlugin'

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
  children: any[]
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
    type: ELEMENT_BLOCK_LIST,
    id: uuid(),
    listType: BlockRefList.Style.NONE,
    children: [
      {
        type: ELEMENT_TRANSCLUSION,
        id: 'transclusion-12345',
        children: [{text: ''}],
      },
      {
        type: ELEMENT_BLOCK,
        id: uuid(),
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
    ],
  },
]

export const initialValue: EditorState = {
  title: '',
  description: '',
  sections: initialBlocksValue,
}

import {Editor as SlateEditor, Path, Node} from 'slate'
import {ReactEditor} from 'slate-react'
import {ELEMENT_PARAGRAPH} from './elements/defaults'
import {BlockRefList} from '@mintter/api'
import {v4 as uuid} from 'uuid'
import {ELEMENT_BLOCK} from './BlockPlugin/defaults'
import {ELEMENT_BLOCK_LIST} from './HierarchyPlugin/defaults'

export interface MintterEditor extends ReactEditor {
  charCount: (editor: ReactEditor, path: Path) => number
}

export interface EditorState {
  title: string
  subtitle: string
  blocks: Node[]
  mentions: string[]
}

export interface SlateBlock {
  id: string
  type: string
  listType?: BlockRefList.Style
  children: any[]
}

export const Editor = {
  ...SlateEditor,
  charCount: (editor: ReactEditor, path: Path): number => {
    const txt = SlateEditor.string(editor, path)
    return txt.trim().length
  },
  handlePush: pushFn => route => {
    pushFn(route)
  },
}
export const initialBlocksValue = [
  {
    type: ELEMENT_BLOCK_LIST,
    id: uuid(),
    listType: BlockRefList.Style.NONE,
    children: [
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
  subtitle: '',
  blocks: initialBlocksValue,
  mentions: [],
}

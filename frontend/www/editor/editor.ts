import {Editor as SlateEditor, Node} from 'slate'
import {ELEMENT_PARAGRAPH} from './elements/defaults'
import {BlockRefList} from '@mintter/api/v2/documents_pb'
import {id} from './id'
import {ELEMENT_BLOCK} from './block-plugin/defaults'
import {ELEMENT_BLOCK_LIST} from './hierarchy-plugin/defaults'

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

export const Editor = SlateEditor

export const initialBlocksValue = [
  {
    type: ELEMENT_BLOCK_LIST,
    id: id(),
    listType: BlockRefList.Style.NONE,
    children: [
      {
        type: ELEMENT_BLOCK,
        id: id(),
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

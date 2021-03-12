import { Editor as SlateEditor, Node } from 'slate';
import { ELEMENT_PARAGRAPH } from './elements/defaults';
import documents from '@mintter/api/documents/v1alpha/documents_pb';
import { id } from './id';
import { ELEMENT_BLOCK } from './block-plugin/defaults';
import { ELEMENT_BLOCK_LIST } from './hierarchy-plugin/defaults';

export interface EditorState {
  title: string;
  subtitle: string;
  blocks: Node[];
  mentions: string[];
}

export interface SlateBlock {
  id: string;
  type: string;
  listStyle?: documents.ListStyle;
  children: any[];
}

export const Editor = SlateEditor;

export const initialBlocksValue = [
  {
    type: ELEMENT_BLOCK_LIST,
    id: id(),
    listStyle: documents.ListStyle.NONE,
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
];

export const initialValue: EditorState = {
  title: '',
  subtitle: '',
  blocks: initialBlocksValue,
  mentions: [],
};

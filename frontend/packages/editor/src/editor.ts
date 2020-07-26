import {Editor as SlateEditor, Transforms, Path} from 'slate'
import {ReactEditor} from 'slate-react'
import {ELEMENT_PARAGRAPH, ELEMENT_BLOCK} from './elements'

export interface MintterEditor extends ReactEditor {
  addSection: (editor: ReactEditor) => void
  charCount: (editor: ReactEditor, path: Path) => number
}

// TODO: fix types here
export const Editor = {
  ...SlateEditor,
  // TODO: (Horacio): accept options to add a section in other places
  addSection: (editor: ReactEditor): void => {
    const newNode = {
      type: ELEMENT_BLOCK,
      children: [{type: ELEMENT_PARAGRAPH, children: [{text: ''}]}],
    }
    // const newNode = {
    //   type: ELEMENT_PARAGRAPH,
    //   children: [{text: ''}],
    // }
    // the end of the document
    const at = [editor.children.length]
    Transforms.insertNodes(editor, newNode, {at})
    ReactEditor.focus(editor)
    Transforms.select(editor, SlateEditor.end(editor, []))
  },
  charCount: (editor: ReactEditor, path: Path): number => {
    const txt = SlateEditor.string(editor, path)
    return txt.trim().length
  },
}

export const initialSectionsValue = [
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

// export const initialSectionsValue = [
//   {
//     type: ELEMENT_PARAGRAPH,
//     children: [
//       {
//         text: '',
//       },
//     ],
//   },
// ]

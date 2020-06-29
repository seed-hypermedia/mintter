import {Editor as SlateEditor, Transforms, Path, Range} from 'slate'
import {ReactEditor} from 'slate-react'
import {nodeTypes} from './nodeTypes'

export interface MintterEditor extends ReactEditor {
  addSection: (editor: ReactEditor) => void
  charCount: (editor: ReactEditor, path: Path) => number
  toggleBlocksActive: (editor: ReactEditor) => void
}

// TODO: fix types here
export const Editor = {
  ...SlateEditor,
  // TODO: (Horacio): accept options to add a section in other places
  addSection: (editor: ReactEditor): void => {
    const newNode = {
      type: nodeTypes.typeSection,
      children: [{type: nodeTypes.typeP, children: [{text: ''}]}],
    }
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
  toggleBlocksActive: (editor: ReactEditor): void => {
    const {selection} = editor

    if (selection && Range.isCollapsed(selection)) {
      // // check which section has focus
      // const [, activePath = [0]]: any = Editor.above(editor, {
      //   match: n => {
      //     return n.type === 'section'
      //   },
      // })

      // for (const [, path] of Editor.nodes(editor, {
      //   at: [],
      //   match: n => n.type === nodeTypes.typeSection,
      // })) {
      //   Transforms.setNodes(
      //     editor,
      //     {active: path[0] === activePath[0]},
      //     {at: path},
      //   )
      // }
      console.log('toggle!!')
    }
  },
}

export const initialSectionsValue = [
  {
    type: 'section',
    children: [
      {
        type: nodeTypes.typeP,
        children: [
          {
            text: '',
          },
        ],
      },
    ],
  },
]

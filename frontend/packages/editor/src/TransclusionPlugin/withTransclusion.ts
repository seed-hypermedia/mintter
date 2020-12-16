import {ReactEditor} from 'slate-react'
import {
  Editor,
  Transforms,
  // Path
} from 'slate'
import {id} from '../id'
// import {ELEMENT_PARAGRAPH} from '../elements/defaults'
import {ELEMENT_TRANSCLUSION} from './defaults'
import {ELEMENT_READ_ONLY} from '../ReadOnlyPlugin'

export const withTransclusion = options => <T extends ReactEditor>(
  editor: T,
) => {
  const {deleteBackward} = editor

  editor.deleteBackward = unit => {
    const {selection} = editor

    if (selection) {
      const [pNode, pPath] = Editor.parent(editor, selection)
      if (pNode.type === ELEMENT_READ_ONLY) {
        const [blockNode, blockPath] = Editor.parent(editor, pPath)
        if (blockNode.type === ELEMENT_TRANSCLUSION) {
          Transforms.delete(editor, {at: blockPath})
          Transforms.insertNodes(
            editor,
            {
              type: options.block.type,
              id: id(),
              children: [{type: options.p.type, children: [{text: ''}]}],
            },
            {at: blockPath},
          )
          Transforms.select(editor, blockPath)

          return
        }
      }
    }

    deleteBackward(unit)
  }

  return editor
}

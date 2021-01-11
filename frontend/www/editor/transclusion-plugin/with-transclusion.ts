import {ReactEditor} from 'slate-react'
import {
  Editor,
  Transforms,
  // Path
} from 'slate'
import {id} from '../id'
// import {ELEMENT_PARAGRAPH} from '../elements/defaults'
import {ELEMENT_TRANSCLUSION} from './defaults'
import {ELEMENT_READ_ONLY} from '../readonly-plugin/defaults'

export const withTransclusion = options => <T extends ReactEditor>(
  editor: T,
) => {
  const e = editor as T & ReactEditor
  const {deleteBackward, deleteFragment} = e

  e.deleteBackward = unit => {
    const {selection} = editor

    if (selection) {
      const [parentNode, parentPath] = Editor.parent(editor, selection)
      // console.log('=== TRANSCLUSION -> SELECTION PARENT', {
      //   unit,
      //   selection,
      //   parentNode,
      //   parentPath,
      // })
      if (parentNode.type === ELEMENT_READ_ONLY) {
        const [blockNode, blockPath] = Editor.parent(editor, parentPath)
        // console.log('=== TRANSCLUSION -> READ ONLY PARENT', {
        //   blockNode,
        //   blockPath,
        // })
        if (blockNode.type === ELEMENT_TRANSCLUSION) {
          const [blockListNode] = Editor.parent(editor, blockPath)

          Editor.withoutNormalizing(editor, () => {
            Transforms.delete(editor, {at: blockPath})
            if (blockListNode.children.length === 0) {
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
            }
          })

          return
        }
      }
    }

    deleteBackward(unit)
  }

  e.deleteFragment = () => {
    const {selection} = e
    console.log('withTransclusion => deleteFragment', selection)

    deleteFragment()
  }

  return e
}

import {ReactEditor} from 'slate-react'
import {
  Editor,
  Transforms,
  // Path
} from 'slate'
import {v4 as uuid} from 'uuid'
// import {ELEMENT_PARAGRAPH} from '../elements/defaults'
import {ELEMENT_TRANSCLUSION} from './defaults'
import {ELEMENT_READ_ONLY} from '../ReadOnlyPlugin'

export const withTransclusion = options => <T extends ReactEditor>(
  editor: T,
) => {
  const {insertBreak, deleteBackward} = editor

  editor.insertBreak = () => {
    // const {selection} = editor
    // if (selection) {
    //   const [readOnlyNode, readOnlyPath] = Editor.parent(editor, selection)
    //   if (readOnlyNode.type === options.read_only.type) {
    //     const tPath = Path.parent(readOnlyPath)
    //     const nextBlock = Path.next(tPath)
    //     Transforms.insertNodes(
    //       editor,
    //       {
    //         type: options.block.type,
    //         id: uuid(),
    //         children: [{type: options.p.type, children: [{text: ''}]}],
    //       },
    //       {
    //         at: nextBlock,
    //       },
    //     )
    //     Transforms.select(editor, Editor.start(editor, nextBlock))
    //     return
    //   }
    // }

    insertBreak()
  }

  editor.deleteBackward = unit => {
    const {selection} = editor

    if (selection) {
      const [pNode, pPath] = Editor.parent(editor, selection)
      if (pNode.type === ELEMENT_READ_ONLY) {
        const [blockNode, blockPath] = Editor.parent(editor, pPath)
        if (blockNode.type === ELEMENT_TRANSCLUSION) {
          Editor.withoutNormalizing(editor, () => {
            Transforms.delete(editor, {at: blockPath})
            Transforms.insertNodes(
              editor,
              {
                type: options.block.type,
                id: uuid(),
                children: [{type: options.p.type, children: [{text: ''}]}],
              },
              {at: blockPath},
            )
            Transforms.select(editor, blockPath)
          })

          return
        }
      }
    }

    deleteBackward(unit)
  }

  return editor
}

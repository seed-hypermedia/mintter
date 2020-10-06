import {ReactEditor} from 'slate-react'
import {
  Editor,
  Transforms,
  Path,
  // Node
} from 'slate'
import {v4 as uuid} from 'uuid'
import {ELEMENT_PARAGRAPH} from '../elements/defaults'
import {ELEMENT_TRANSCLUSION} from './defaults'

export const withTransclusion = options => <T extends ReactEditor>(
  editor: T,
) => {
  const {insertBreak, deleteBackward} = editor

  editor.insertBreak = () => {
    const {selection} = editor
    console.log('transclusion plugin!')
    if (selection) {
      const [tNode, tPath] = Editor.parent(editor, selection)
      if (tNode.type === options.transclusion.type) {
        console.log('ENTER EN TRANSCLUSION!', selection)
        const nextBlock = Path.next(tPath)
        Transforms.insertNodes(
          editor,
          {
            type: options.block.type,
            id: uuid(),
            children: [{type: options.p.type, children: [{text: ''}]}],
          },
          {
            at: nextBlock,
          },
        )
        Transforms.select(editor, Editor.start(editor, nextBlock))
        return
      }
    }

    insertBreak()
  }

  editor.deleteBackward = unit => {
    console.log('deleteBackward:', {unit})
    const {selection} = editor

    if (selection) {
      const [pNode, pPath] = Editor.parent(editor, selection)
      if (pNode.type === ELEMENT_PARAGRAPH) {
        const [blockNode, blockPath] = Editor.parent(editor, pPath)
        if (blockNode.type === ELEMENT_TRANSCLUSION) {
          Transforms.select(
            editor,
            Editor.end(editor, Path.previous(blockPath)),
          )
          return
        }
      }
    }

    deleteBackward(unit)
  }

  // editor.isVoid = element => {
  //   const path = ReactEditor.findPath(editor, element)
  //   console.log('path', path)
  //   const parent = Node.parent(editor, path)
  //   console.log('parent', parent)
  //   return parent.type === ELEMENT_TRANSCLUSION ? true : isVoid(element)
  // }

  return editor
}

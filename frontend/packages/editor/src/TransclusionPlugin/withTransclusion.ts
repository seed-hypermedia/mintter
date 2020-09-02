import {ReactEditor} from 'slate-react'
import {Editor, Transforms, Path} from 'slate'
import {ELEMENT_BLOCK, ELEMENT_PARAGRAPH} from '../elements'
import {ELEMENT_TRANSCLUSION} from './transclusion'
import {v4 as uuid} from 'uuid'

export const withTransclusion = options => <T extends ReactEditor>(
  editor: T,
) => {
  console.log(options)
  const {insertBreak} = editor

  editor.insertBreak = () => {
    console.log('break here!')

    const {selection} = editor

    if (selection) {
      const [tNode, tPath] = Editor.parent(editor, selection)
      console.log('editor.insertBreak -> pNode, pPath', tNode, tPath)
      if (tNode.type === ELEMENT_TRANSCLUSION) {
        const nextBlock = Path.next(tPath)
        console.log('editor.insertBreak -> nextBlock', nextBlock)
        Transforms.insertNodes(
          editor,
          {
            type: ELEMENT_BLOCK,
            id: uuid(),
            children: [{type: ELEMENT_PARAGRAPH, children: [{text: ''}]}],
          },
          {
            at: nextBlock,
          },
        )
        Transforms.select(editor, Editor.start(editor, nextBlock))
      } else {
        console.log('no es transclusion')
      }
    }

    insertBreak()
  }

  return editor
}

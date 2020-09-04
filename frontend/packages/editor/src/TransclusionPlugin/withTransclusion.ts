import {ReactEditor} from 'slate-react'
import {Editor, Transforms, Path} from 'slate'
import {ELEMENT_PARAGRAPH} from '../elements'
import {ELEMENT_BLOCK} from '../BlockPlugin/block'
import {ELEMENT_TRANSCLUSION} from './transclusion'
import {v4 as uuid} from 'uuid'

export const withTransclusion = options => <T extends ReactEditor>(
  editor: T,
) => {
  console.log(options)
  const {insertBreak} = editor

  editor.insertBreak = () => {
    const {selection} = editor
    console.log('transclusion plugin!')
    if (selection) {
      const [tNode, tPath] = Editor.parent(editor, selection)
      if (tNode.type === ELEMENT_TRANSCLUSION) {
        console.log('ENTER EN TRANSCLUSION!', selection)
        const nextBlock = Path.next(tPath)
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
        return
      }
    }

    insertBreak()
  }

  return editor
}

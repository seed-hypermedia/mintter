import {ReactEditor} from 'slate-react'
import {Editor, Transforms, Path} from 'slate'
import {v4 as uuid} from 'uuid'

export const withTransclusion = options => <T extends ReactEditor>(
  editor: T,
) => {
  const {insertBreak} = editor

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

  return editor
}

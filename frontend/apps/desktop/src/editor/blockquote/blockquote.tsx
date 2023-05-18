import {MintterEditor} from '@app/editor/mintter-changes/plugin'
import {
  createId,
  isBlockquote,
  paragraph,
  statement,
  text,
} from '@mintter/shared'
import {Editor, Path, Transforms} from 'slate'
import type {EditorPlugin} from '../types'
import {resetFlowContent} from '../utils'

export const ELEMENT_BLOCKQUOTE = 'blockquote'

export const createBlockquotePlugin = (): EditorPlugin => ({
  name: ELEMENT_BLOCKQUOTE,
  configureEditor(editor) {
    const {deleteBackward} = editor

    editor.deleteBackward = (unit) => {
      if (resetFlowContent(editor)) return
      deleteBackward(unit)
    }

    return editor
  },
  onKeyDown: (editor) => {
    return (ev) => {
      if (ev.key == 'Enter') {
        const quote = Editor.above(editor, {match: isBlockquote})
        if (quote) {
          ev.preventDefault()
          const [, quotePath] = quote
          Editor.withoutNormalizing(editor, () => {
            let newBlock = statement({id: createId()}, [paragraph([text('')])])
            Transforms.insertNodes(editor, newBlock, {
              at: Path.next(quotePath),
            })
            Transforms.select(editor, Path.next(quotePath))
            Transforms.collapse(editor, {edge: 'start'})
            MintterEditor.addChange(editor, ['moveBlock', newBlock.id])
            MintterEditor.addChange(editor, ['replaceBlock', newBlock.id])
          })
        }
      }
    }
  },
})

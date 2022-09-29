import {useBlockProps} from '@app/editor/editor-node-props'
import {MintterEditor} from '@app/editor/mintter-changes/plugin'
import {EditorMode} from '@app/editor/plugin-utils'
import {createId, isBlockquote, paragraph, statement, text} from '@app/mttast'
import {Editor, Path, Transforms} from 'slate'
import {RenderElementProps} from 'slate-react'
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
  renderElement:
    (editor) =>
    ({attributes, children, element}) => {
      if (isBlockquote(element)) {
        return (
          <BlockQuote
            mode={editor.mode}
            element={element}
            attributes={attributes}
          >
            {children}
          </BlockQuote>
        )
      }
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

function BlockQuote({
  element,
  attributes,
  children,
  mode,
}: RenderElementProps & {mode: EditorMode}) {
  let {blockProps} = useBlockProps(element)

  if (mode == EditorMode.Embed) {
    return (
      <span {...attributes} {...blockProps}>
        {children}
      </span>
    )
  }

  return (
    <li {...attributes} {...blockProps}>
      {children}
    </li>
  )
}

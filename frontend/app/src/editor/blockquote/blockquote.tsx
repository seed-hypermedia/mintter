import {BlockWrapper} from '@app/editor/block-wrapper'
import {EditorMode} from '@app/editor/plugin-utils'
import {styled} from '@app/stitches.config'
import {Blockquote as BlockquoteType, createId, isBlockquote, paragraph, statement, text} from '@mintter/mttast'
import {Editor, Path, Transforms} from 'slate'
import {RenderElementProps} from 'slate-react'
import {statementStyle} from '../statement'
import type {EditorPlugin} from '../types'
import {resetFlowContent} from '../utils'

export const ELEMENT_BLOCKQUOTE = 'blockquote'

export const createBlockquotePlugin = (): EditorPlugin => ({
  name: ELEMENT_BLOCKQUOTE,
  configureEditor(editor) {
    if (editor.readOnly) return
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
          <BlockQuote mode={editor.mode} element={element} attributes={attributes}>
            {children}
          </BlockQuote>
        )
      }
    },
  onKeyDown: (editor) => {
    if (editor.readOnly) return
    return (ev) => {
      if (ev.key == 'Enter') {
        const quote = Editor.above(editor, {match: isBlockquote})
        if (quote) {
          ev.preventDefault()
          const [, quotePath] = quote
          Editor.withoutNormalizing(editor, () => {
            Transforms.insertNodes(editor, statement({id: createId()}, [paragraph([text('')])]), {
              at: Path.next(quotePath),
            })
            Transforms.select(editor, Path.next(quotePath))
            Transforms.collapse(editor, {edge: 'start'})
          })
        }
      }
    }
  },
})

export var BlockQuoteUI = styled('li', statementStyle, {
  // marginTop: '$6',
  // marginBottom: '$6',
  marginVertical: '$4',
})

function BlockQuote({element, attributes, children, mode}: RenderElementProps & {mode: EditorMode}) {
  if (mode == EditorMode.Embed || mode == EditorMode.Mention) {
    return <span {...attributes}>{children}</span>
  }

  return (
    <BlockQuoteUI data-element-type={element.type} data-element-id={(element as BlockquoteType).id} {...attributes}>
      <BlockWrapper element={element} attributes={attributes} mode={mode}>
        {children}
      </BlockWrapper>
    </BlockQuoteUI>
  )
}

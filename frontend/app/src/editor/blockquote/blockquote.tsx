import {BlockWrapper} from '@app/editor/block-wrapper'
import {EditorMode} from '@app/editor/plugin-utils'
import {styled} from '@app/stitches.config'
import {isBlockquote} from '@mintter/mttast'
import {RenderElementProps} from 'slate-react'
import {BlockTools} from '../block-tools'
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
})

export var BlockQuoteUI = styled('li', statementStyle, {
  marginTop: '$6',
  marginBottom: '$6',
})

function BlockQuote({element, attributes, children, mode}: RenderElementProps & {mode: EditorMode}) {
  if (mode == EditorMode.Embed || mode == EditorMode.Mention) {
    return <span {...attributes}>{children}</span>
  }

  return (
    <BlockQuoteUI data-element-type={element.type} {...attributes}>
      <BlockTools element={element} />
      <BlockWrapper element={element} attributes={attributes} mode={mode}>
        {children}
      </BlockWrapper>
    </BlockQuoteUI>
  )
}

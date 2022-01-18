import {styled} from '@app/stitches.config'
import {FlowContent, isBlockquote} from '@mintter/mttast'
import {BlockTools} from '../block-tools'
import {statementStyle} from '../statement'
import type {EditorPlugin} from '../types'
import {resetFlowContent} from '../utils'

export const ELEMENT_BLOCKQUOTE = 'blockquote'

export const BlockQuote = styled('li', statementStyle, {
  marginTop: '$6',
  marginBottom: '$6',
})

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
    () =>
    ({attributes, children, element}) => {
      if (isBlockquote(element)) {
        return (
          <BlockQuote data-element-type={element.type} {...attributes}>
            <BlockTools element={element as FlowContent} />
            {children}
          </BlockQuote>
        )
      }
    },
})

import {isBlockquote} from '@mintter/mttast'
import {styled} from '@mintter/ui/stitches.config'
import {StatementTools, Tools} from '../statement-tools'
import type {EditorPlugin} from '../types'
import {turnIntoDefaultFlowContent} from '../utils'
import {statementStyle} from './statement'

export const ELEMENT_BLOCKQUOTE = 'blockquote'

// TODO: add dragger + new grid styles

export const BlockQuote = styled('li', statementStyle)

export const createBlockquotePlugin = (): EditorPlugin => ({
  name: ELEMENT_BLOCKQUOTE,
  renderElement({attributes, children, element}) {
    if (isBlockquote(element)) {
      return (
        <BlockQuote data-element-type={element.type} {...attributes}>
          <StatementTools element={element} />
          {children}
        </BlockQuote>
      )
    }
  },
  configureEditor(editor) {
    const {deleteBackward} = editor

    editor.deleteBackward = (unit) => {
      if (turnIntoDefaultFlowContent(editor)) return
      deleteBackward(unit)
    }

    return editor
  },
})

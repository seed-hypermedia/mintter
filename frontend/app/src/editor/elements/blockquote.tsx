import {styled} from '@mintter/ui/stitches.config'
import {StatementTools} from '../statement-tools'
import type {EditorPlugin} from '../types'
import {statementStyle} from './statement'

export const ELEMENT_BLOCKQUOTE = 'blockquote'

// TODO: add dragger + new grid styles

export const BlockQuote = styled('blockquote', statementStyle)

export const createBlockquotePlugin = (): EditorPlugin => ({
  name: ELEMENT_BLOCKQUOTE,
  renderElement({attributes, children, element}) {
    if (element.type === ELEMENT_BLOCKQUOTE) {
      return (
        <BlockQuote data-element-type={element.type} {...attributes}>
          <StatementTools element={element} />
          {children}
        </BlockQuote>
      )
    }
  },
})

import type {Blockquote, Embed} from '@mintter/mttast'
import {styled} from '@mintter/ui/stitches.config'
import type {EditorPlugin} from '../types'

export const ELEMENT_BLOCKQUOTE = 'blockquote'

export const BlockQuote = styled('blockquote', {
  backgroundColor: '$background-muted',
  padding: '$7',
  marginLeft: '-$5',
  marginRight: '-$5',
  marginVertical: '$3',
  position: 'relative',
  borderRadius: '$2',
  overflow: 'hidden',
  '&::before': {
    content: '',
    position: 'absolute',
    left: 0,
    top: 0,
    width: 4,
    height: '$full',
    backgroundColor: '$secondary-soft',
  },
})

export const createBlockquotePlugin = (): EditorPlugin => ({
  name: ELEMENT_BLOCKQUOTE,
  renderElement({attributes, children, element}) {
    if (element.type === ELEMENT_BLOCKQUOTE) {
      return (
        <BlockQuote data-element-type={element.type} {...attributes}>
          {children}
        </BlockQuote>
      )
    }
  },
})

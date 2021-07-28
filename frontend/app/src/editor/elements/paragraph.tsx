import {styled} from '@mintter/ui/stitches.config'
import {SlatePlugin} from '../types'

export const ELEMENT_PARAGRAPH = 'paragraph'

const Paragraph = styled('p', {
  padding: '$3',
  '&:hover': {
    backgroundColor: '$background-muted',
  },
})

export const createParagraphPlugin = (): SlatePlugin => ({
  key: ELEMENT_PARAGRAPH,
  renderElement({attributes, children, element}) {
    if (element.type === ELEMENT_PARAGRAPH) {
      return <Paragraph {...attributes}>{children}</Paragraph>
    }
  },
})

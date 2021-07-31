import {styled} from '@mintter/ui/stitches.config'
import type {EditorPlugin} from '../types'
import {Text} from '@mintter/ui/text'

export const ELEMENT_STATIC_PARAGRAPH = 'staticParagraph'

const StaticParagraph = styled('span', {
  padding: '$1',
  display: 'block',
  paddingHorizontal: '$3',
  margin: 0,
  borderRadius: '$1',
  transition: 'all 0.1s ease',
  '&:hover': {
    backgroundColor: '$background-muted',
  },
})

export const createStaticParagraphPlugin = (): EditorPlugin => ({
  name: ELEMENT_STATIC_PARAGRAPH,
  renderElement({attributes, children, element}) {
    if (element.type === ELEMENT_STATIC_PARAGRAPH) {
      return <StaticParagraph {...attributes}>{children}</StaticParagraph>
    }
  },
})

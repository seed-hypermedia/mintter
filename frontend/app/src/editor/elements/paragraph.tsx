import {styled} from '@mintter/ui/stitches.config'
import type {EditorPlugin} from 'mixtape'
import {Text} from '@mintter/ui/text'

export const ELEMENT_PARAGRAPH = 'paragraph'

const Paragraph = styled(Text, {
  padding: '$1',
  paddingHorizontal: '$3',
  margin: 0,
  borderRadius: '$1',
  transition: 'all 0.1s ease',
  '&:hover': {
    backgroundColor: '$background-muted',
  },
})

export const createParagraphPlugin = (): EditorPlugin => ({
  name: ELEMENT_PARAGRAPH,
  renderElement({attributes, children, element}) {
    if (element.type === ELEMENT_PARAGRAPH) {
      return (
        <Paragraph alt size="4" {...attributes}>
          {children}
        </Paragraph>
      )
    }
  },
})

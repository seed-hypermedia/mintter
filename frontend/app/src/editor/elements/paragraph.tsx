import {styled} from '@mintter/ui/stitches.config'
import type {EditorPlugin} from '../types'
import {Text} from '@mintter/ui/text'

export const ELEMENT_PARAGRAPH = 'paragraph'

const Paragraph = styled(Text, {})

export const createParagraphPlugin = (): EditorPlugin => ({
  name: ELEMENT_PARAGRAPH,
  renderElement({attributes, children, element}) {
    if (element.type === ELEMENT_PARAGRAPH) {
      return (
        <Paragraph as="p" alt size="4" css={{paddingLeft: '$2'}} {...attributes}>
          {children}
        </Paragraph>
      )
    }
  },
})

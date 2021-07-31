import {styled} from '@mintter/ui/stitches.config'
import {Text} from '@mintter/ui/text'
import type {EditorPlugin} from '../types'

export const ELEMENT_HEADING = 'heading'

export const Heading = styled('div', {
  fontSize: '$7',
  fontWeight: '$bold',
  lineHeight: '$3',
})

export const createHeadingPlugin = (): EditorPlugin => ({
  name: ELEMENT_HEADING,
  renderElement({attributes, children, element}) {
    if (element.type === ELEMENT_HEADING) {
      return <Heading {...attributes}>{children}</Heading>
    }
  },
})

import {styled} from '@mintter/ui/stitches.config'
import {Text} from '@mintter/ui/text'
import type {EditorPlugin} from '../types'

export const ELEMENT_HEADING = 'heading'

export const Heading = styled('div', {
  '& > span': {
    fontSize: '$7',
    fontWeight: '$bold',
    lineHeight: '$3',
  },
})

export const createHeadingPlugin = (): EditorPlugin => ({
  name: ELEMENT_HEADING,
  renderElement({attributes, children, element}) {
    if (element.type === ELEMENT_HEADING) {
      return <Heading {...attributes}>{children}</Heading>
    }
  },
  configureEditor: editor => {
    /**
     * TODO: override insertBreak
     * - if Start: ???
     * - if End:
     *  - create a group
     *  - create a statement
     *  - select child statement
     * - if Middle:
     *  - break static paragraph
     *  - move text into new paragraph
     *  - wrap paragraph in a statement
     *  - wrap statement in a group (should be in the correct position: second child of heading)
     *  
     */
  }
})

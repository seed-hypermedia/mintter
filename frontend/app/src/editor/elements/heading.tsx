import {styled} from '@mintter/ui/stitches.config'
import {Text} from '@mintter/ui/text'
import {Icon} from '@mintter/ui/icon'
import type {EditorPlugin} from '../types'
import {Dragger, Tools} from './statement'
import {Box} from '@mintter/ui/box'
import {Marker} from '../marker'

export const ELEMENT_HEADING = 'heading'

export const Heading = styled('li', {
  marginTop: '$7',
  padding: 0,
  position: 'relative',
  display: 'flex',
  alignItems: 'flex-start',
  listStyle: 'none',
})

export const createHeadingPlugin = (): EditorPlugin => ({
  name: ELEMENT_HEADING,
  renderElement({attributes, children, element}) {
    // TODO: compute heading level
    if (element.type === ELEMENT_HEADING) {
      return (
        <Heading {...attributes}>
          <Tools contentEditable={false}>
            <Dragger>
              <Icon name="Grid6" size="2" color="muted" />
            </Dragger>
            <Marker element={element} />
          </Tools>
          <Box
            css={{
              flex: 1,
              '& > p': {
                fontWeight: '$bold',
              },
            }}
          >
            {children}
          </Box>
        </Heading>
      )
    }
  },
  configureEditor: (editor) => {
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
  },
})

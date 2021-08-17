import {styled} from '@mintter/ui/stitches.config'
import type {EditorPlugin} from '../types'

export const ELEMENT_GROUP = 'group'

export const Group = styled('ul', {
  margin: 0,
  padding: 0,
  position: 'relative',
  // marginLeft: '$6',
})

export const createGroupPlugin = (): EditorPlugin => ({
  name: ELEMENT_GROUP,
  renderElement({attributes, children, element}) {
    if (element.type === ELEMENT_GROUP) {
      return (
        <Group data-element-type={element.type} {...attributes}>
          {children}
        </Group>
      )
    }
  },
})

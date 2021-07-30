import type {EditorPlugin} from 'mixtape'
import {styled} from '@mintter/ui/stitches.config'

export const ELEMENT_GROUP = 'group'

export const Group = styled('ul', {
  margin: 0,
  padding: 0,
  paddingLeft: '$5',
  '& > li': {
    listStyle: 'none',
  },
})

export const createGroupPlugin = (): EditorPlugin => ({
  name: ELEMENT_GROUP,
  renderElement({attributes, children, element}) {
    if (element.type === ELEMENT_GROUP) {
      return <Group {...attributes}>{children}</Group>
    }
  },
})

import {SlatePlugin} from '../types'
import {styled} from '@mintter/ui/stitches.config'

export const ELEMENT_GROUP = 'group'

export const Group = styled('ul', {
  margin: 0,
  padding: 0,
  paddingLeft: '$6',
  '& > li': {
    listStyle: 'none',
  },
})

export const createGroupPlugin = (): SlatePlugin => ({
  key: ELEMENT_GROUP,
  renderElement({attributes, children, element}) {
    if (element.type === ELEMENT_GROUP) {
      return <Group {...attributes}>{children}</Group>
    }
  },
})

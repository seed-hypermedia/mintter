import {styled} from '@mintter/ui/stitches.config'
import type {EditorPlugin} from '../types'

export const ELEMENT_UNORDERED_LIST = 'unorderedList'

export const UnorderedList = styled('ul', {
  margin: 0,
  padding: 0,
  position: 'relative',
  '& > li': {
    position: 'relative',
    '&::before': {
      content: '',
      position: 'absolute',
      top: 16, // TODO: calculate this with the line height size / 2
      left: 0,
      width: 6,
      height: 6,
      borderRadius: 6,
      background: 'black',
    },
  },
})

export const createUnorderedListPlugin = (): EditorPlugin => ({
  name: ELEMENT_UNORDERED_LIST,
  renderElement({attributes, children, element}) {
    if (element.type === ELEMENT_UNORDERED_LIST) {
      return <UnorderedList {...attributes}>{children}</UnorderedList>
    }
  },
})

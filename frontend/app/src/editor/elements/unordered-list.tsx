import {styled} from '@mintter/ui/stitches.config'
import type {EditorPlugin} from '../types'
import {Group} from './group'

export const ELEMENT_UNORDERED_LIST = 'unorderedList'

export const UnorderedList = styled(Group, {
  margin: 0,
  marginLeft: '-$8',
  padding: 0,
  position: 'relative',
})

export const createUnorderedListPlugin = (): EditorPlugin => ({
  name: ELEMENT_UNORDERED_LIST,
  renderElement({attributes, children, element}) {
    if (element.type === ELEMENT_UNORDERED_LIST) {
      return (
        <UnorderedList {...attributes} className="hello" data-element-type={element.type}>
          {children}
        </UnorderedList>
      )
    }
  },
})

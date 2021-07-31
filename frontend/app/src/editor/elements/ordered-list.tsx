import {styled} from '@mintter/ui/stitches.config'
import type {EditorPlugin} from '../types'

export const ELEMENT_ORDERED_LIST = 'orderedList'

export const OrderedList = styled('ol', {
  margin: 0,
  padding: 0,
  paddingLeft: '$5',
})

export const createOrderedListPlugin = (): EditorPlugin => ({
  name: ELEMENT_ORDERED_LIST,
  renderElement({attributes, children, element}) {
    if (element.type === ELEMENT_ORDERED_LIST) {
      return <OrderedList {...attributes}>{children}</OrderedList>
    }
  },
})

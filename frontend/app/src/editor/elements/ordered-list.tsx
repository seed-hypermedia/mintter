import {styled} from '@mintter/ui/stitches.config'
import type {EditorPlugin} from '../types'
import {Group} from './group'

export const ELEMENT_ORDERED_LIST = 'orderedList'

export const OrderedList = styled(Group, {
  margin: 0,
  padding: 0,
})

export const createOrderedListPlugin = (): EditorPlugin => ({
  name: ELEMENT_ORDERED_LIST,
  renderElement({attributes, children, element}) {
    if (element.type === ELEMENT_ORDERED_LIST) {
      return (
        <OrderedList as="ol" data-grouping-type={element.type} {...attributes}>
          {children}
        </OrderedList>
      )
    }
  },
})

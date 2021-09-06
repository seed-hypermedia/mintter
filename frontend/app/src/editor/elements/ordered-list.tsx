import {styled} from '@mintter/ui/stitches.config'
import type {EditorPlugin} from '../types'
import {groupStyle, removeEmptyGroup} from './group'

export const ELEMENT_ORDERED_LIST = 'orderedList'

export const OrderedList = styled('ol', groupStyle)

export const createOrderedListPlugin = (): EditorPlugin => ({
  name: ELEMENT_ORDERED_LIST,
  renderElement({attributes, children, element}) {
    if (element.type === ELEMENT_ORDERED_LIST) {
      return (
        <OrderedList
          type={element.type}
          data-grouping-type={element.type}
          start={element.start}
          style={{counterReset: `section ${element.start ? element.start - 1 : ''}`}}
          {...attributes}
        >
          {children}
        </OrderedList>
      )
    }
  },
  configureEditor(editor) {
    const {normalizeNode} = editor

    editor.normalizeNode = (entry) => {
      if (removeEmptyGroup(editor, entry)) return
      normalizeNode(entry)
    }

    return editor
  },
})

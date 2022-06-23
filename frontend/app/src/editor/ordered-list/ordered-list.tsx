import {styled} from '@app/stitches.config'
import {isOrderedList} from '@mintter/mttast'
import {groupStyle} from '../group'
import type {EditorPlugin} from '../types'
import {resetGroupingContent} from '../utils'

export const ELEMENT_ORDERED_LIST = 'orderedList'

export const OrderedList = styled('ol', groupStyle)

export const createOrderedListPlugin = (): EditorPlugin => ({
  name: ELEMENT_ORDERED_LIST,
  renderElement:
    () =>
    ({attributes, children, element}) => {
      if (isOrderedList(element)) {
        return (
          <OrderedList
            data-element-type={element.type}
            start={element.start}
            {...attributes}
          >
            {children}
          </OrderedList>
        )
      }
    },
  configureEditor(editor) {
    if (editor.readOnly) return
    const {deleteBackward} = editor

    editor.deleteBackward = (unit) => {
      if (resetGroupingContent(editor)) return
      deleteBackward(unit)
    }
    return editor
  },
})

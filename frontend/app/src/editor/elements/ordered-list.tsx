import { isOrderedList } from '@mintter/mttast'
import { styled } from '@mintter/ui/stitches.config'
import type { EditorPlugin } from '../types'
import { resetGroupingContent } from '../utils'
import { groupStyle, removeEmptyGroup } from './group'

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
            type={element.type}
            data-grouping-type={element.type}
            start={element.start}
            /**
             * @todo proper handling of start property
             * @body OrderedLists now have a start property that indicates at which number the enumeration should start. The handling of this is quite hacky atm though. We should improve this.
             */
            style={{counterReset: `section ${element.start ? element.start - 1 : ''}`}}
            {...attributes}
          >
            {children}
          </OrderedList>
        )
      }
    },
  configureEditor(editor) {
    if (editor.readOnly) return
    const {normalizeNode, deleteBackward} = editor

    editor.normalizeNode = (entry) => {
      if (removeEmptyGroup(editor, entry)) return
      normalizeNode(entry)
    }

    editor.deleteBackward = (unit) => {
      if (resetGroupingContent(editor)) return
      deleteBackward(unit)
    }
    return editor
  },
})

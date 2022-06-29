import {EditorMode} from '@app/editor/plugin-utils'
import {styled} from '@app/stitches.config'
import {isOrderedList} from '@mintter/mttast'
import {forwardRef} from 'react'
import {GroupProps, groupStyle} from '../group'
import type {EditorPlugin} from '../types'
import {resetGroupingContent} from '../utils'

export const ELEMENT_ORDERED_LIST = 'orderedList'

export const StyledOl = styled('ol', groupStyle)

export const createOrderedListPlugin = (): EditorPlugin => ({
  name: ELEMENT_ORDERED_LIST,
  renderElement:
    (editor) =>
    ({attributes, children, element}) => {
      if (isOrderedList(element)) {
        return (
          <OrderedList
            mode={editor.mode}
            element={element}
            attributes={attributes}
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

const OrderedList = forwardRef<GroupProps, any>(
  ({mode, attributes, element, ...props}, ref) => {
    if (mode == EditorMode.Embed || mode == EditorMode.Mention) {
      return null
    }

    return (
      <StyledOl
        {...attributes}
        ref={ref}
        data-element-type={element.type}
        start={element.start}
        {...props}
      />
    )
  },
)

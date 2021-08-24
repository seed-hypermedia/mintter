import {styled} from '@mintter/ui/stitches.config'
import type {EditorPlugin} from '../types'
import {removeEmptyGroup} from './group'
import {Group} from './group'

export const ELEMENT_ORDERED_LIST = 'orderedList'

export const OrderedList = styled(Group, {
  margin: 0,
  padding: 0,
  marginLeft: '-$8',
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
  configureEditor(editor) {
    const {normalizeNode} = editor

    editor.normalizeNode = (entry) => {
      if (removeEmptyGroup(editor, entry)) return
      normalizeNode(entry)
    }

    return editor
  },
})

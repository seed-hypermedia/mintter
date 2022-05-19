import {styled} from '@app/stitches.config'
import {
  createId,
  isFlowContent,
  isOrderedList,
  statement,
} from '@mintter/mttast'
import {Element, Node, Transforms} from 'slate'
import {groupStyle, removeEmptyGroup} from '../group'
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
    const {normalizeNode, deleteBackward} = editor

    editor.normalizeNode = (entry) => {
      const [node, path] = entry
      if (Element.isElement(node) && isOrderedList(node)) {
        if (removeEmptyGroup(editor, entry)) return
        for (const [child, childPath] of Node.children(editor, path)) {
          if (Element.isElement(child) && !isFlowContent(child)) {
            Transforms.wrapNodes(editor, statement({id: createId()}), {
              at: childPath,
            })
            return
          }
        }
      }
      normalizeNode(entry)
    }

    editor.deleteBackward = (unit) => {
      if (resetGroupingContent(editor)) return
      deleteBackward(unit)
    }
    return editor
  },
})

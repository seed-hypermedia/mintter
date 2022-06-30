import {styled} from '@app/stitches.config'
import {isOrderedList} from '@mintter/mttast'
import {Group, groupStyle} from '../group'
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
          <Group mode={editor.mode} element={element} attributes={attributes}>
            {children}
          </Group>
        )
      }
    },
  configureEditor(editor) {
    const {deleteBackward} = editor

    editor.deleteBackward = (unit) => {
      if (resetGroupingContent(editor)) return
      deleteBackward(unit)
    }
    return editor
  },
})

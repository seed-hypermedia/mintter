import {isUnorderedList} from '@mintter/mttast'
import {Group} from '../group'
import type {EditorPlugin} from '../types'
import {resetGroupingContent} from '../utils'

export const ELEMENT_UNORDERED_LIST = 'unorderedList'

export const createUnorderedListPlugin = (): EditorPlugin => ({
  name: ELEMENT_UNORDERED_LIST,
  renderElement:
    (editor) =>
    ({attributes, children, element}) => {
      if (isUnorderedList(element)) {
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

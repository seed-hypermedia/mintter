import {styled} from '@app/stitches.config'
import {isUnorderedList} from '@mintter/mttast'
import {groupStyle} from '../group'
import type {EditorPlugin} from '../types'
import {resetGroupingContent} from '../utils'

export const ELEMENT_UNORDERED_LIST = 'unorderedList'

export const UnorderedList = styled('ul', groupStyle)

export const createUnorderedListPlugin = (): EditorPlugin => ({
  name: ELEMENT_UNORDERED_LIST,
  renderElement:
    () =>
    ({attributes, children, element}) => {
      if (isUnorderedList(element)) {
        return (
          <UnorderedList data-element-type={element.type} {...attributes}>
            {children}
          </UnorderedList>
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

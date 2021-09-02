import {styled} from '@mintter/ui/stitches.config'
import type {EditorPlugin} from '../types'
import {groupStyle, removeEmptyGroup} from './group'
import {Group} from './group'

export const ELEMENT_UNORDERED_LIST = 'unorderedList'

export const UnorderedList = styled('ul', groupStyle)

export const createUnorderedListPlugin = (): EditorPlugin => ({
  name: ELEMENT_UNORDERED_LIST,
  renderElement({attributes, children, element}) {
    if (element.type === ELEMENT_UNORDERED_LIST) {
      return (
        <UnorderedList type={element.type} {...attributes} className="hello" data-element-type={element.type}>
          {children}
        </UnorderedList>
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

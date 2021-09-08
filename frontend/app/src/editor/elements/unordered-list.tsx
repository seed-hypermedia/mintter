import type {EditorPlugin} from '../types'
import {styled} from '@mintter/ui/stitches.config'
import {resetGroupingContent} from '../utils'
import {groupStyle, removeEmptyGroup} from './group'
import {isUnorderedList} from '@mintter/mttast'

export const ELEMENT_UNORDERED_LIST = 'unorderedList'

export const UnorderedList = styled('ul', groupStyle)

export const createUnorderedListPlugin = (): EditorPlugin => ({
  name: ELEMENT_UNORDERED_LIST,
  renderElement({attributes, children, element}) {
    if (isUnorderedList(element)) {
      return (
        <UnorderedList type={element.type} {...attributes} className="hello" data-element-type={element.type}>
          {children}
        </UnorderedList>
      )
    }
  },
  configureEditor(editor) {
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

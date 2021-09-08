import {isFlowContent, isGroup, isGroupContent} from '@mintter/mttast'
import {styled} from '@mintter/ui/stitches.config'
import {Editor} from 'slate'
import type {EditorPlugin} from '../types'
import {isCollapsed} from '../utils'
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
    const {normalizeNode, deleteBackward} = editor

    editor.normalizeNode = (entry) => {
      if (removeEmptyGroup(editor, entry)) return
      normalizeNode(entry)
    }

    editor.deleteBackward = (unit) => {
      console.log('delete!!')
      const {selection} = editor
      if (selection && isCollapsed(selection)) {
        const list = Editor.above(editor, {
          match: (n) => isGroupContent(n) && !isGroup(n),
        })
        console.log({list})
        return
      }
      deleteBackward(unit)
    }

    return editor
  },
})

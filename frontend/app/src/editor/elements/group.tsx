import {styled} from '@mintter/ui/stitches.config'
import {Editor, Transforms} from 'slate'
import type {EditorPlugin} from '../types'
import {removeEmptyGroup} from '../utils'

export const ELEMENT_GROUP = 'group'

export const Group = styled('ul', {
  margin: 0,
  padding: 0,
  position: 'relative',
  // marginLeft: '$6',
})

export const createGroupPlugin = (): EditorPlugin => ({
  name: ELEMENT_GROUP,
  renderElement({attributes, children, element}) {
    if (element.type === ELEMENT_GROUP) {
      return (
        <Group data-element-type={element.type} {...attributes}>
          {children}
        </Group>
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

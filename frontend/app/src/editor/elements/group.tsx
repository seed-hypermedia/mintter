import {isGroupContent} from '@mintter/mttast'
import {styled} from '@mintter/ui/stitches.config'
import {Editor, Node, Transforms} from 'slate'
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
      const [node, path] = entry
      if (isGroupContent(node)) {
        if (removeEmptyGroup(editor, entry)) return
        const parent = Editor.parent(editor, path)
        if (parent) {
          const [parentNode, parentPath] = parent
          if (isGroupContent(parentNode)) {
            Transforms.unwrapNodes(editor, {at: path})
            return
          }
        }
        //   for (const [child, childPath] of Node.children(editor, path)) {
        //     if (isGroupContent(child)) {
        //       console.log('group child!!', child, childPath)
        //       Transforms.unwrapNodes(editor, {at: childPath})
        //       return
        //     }
        //   }
      }

      normalizeNode(entry)
    }

    return editor
  },
})

import {
  Editor,
  // Element,
  Transforms,
  Range,
  Point,
} from 'slate'
import {ReactEditor} from 'slate-react'
import {nodeTypes} from '../nodeTypes'

export function withSections() {
  return <T extends ReactEditor>(editor: T) => {
    const {
      deleteBackward,
      insertText,
      // normalizeNode,
    } = editor

    editor.deleteBackward = (...args) => {
      const {selection} = editor
      if (selection && Range.isCollapsed(selection)) {
        const parent = Editor.above(editor, {
          match: n => n.type === nodeTypes.typeSection,
        })

        if (parent) {
          const [, parentPath] = parent
          const parentStart = Editor.start(editor, parentPath)
          if (editor.children.length > 1) {
            if (Point.equals(selection.anchor, parentStart)) {
              Transforms.removeNodes(editor, {at: parentPath})

              return
            }
          }
        }
      }

      deleteBackward(...args)
    }

    editor.insertText = (text: string) => {
      const {selection} = editor

      if (selection) {
        // check which section has focus
        const [, activePath = [0]]: any = Editor.above(editor, {
          match: n => {
            return n.type === 'section'
          },
        })

        for (const [, path] of Editor.nodes(editor, {
          at: [],
          match: n => n.type === 'section',
        })) {
          Transforms.setNodes(
            editor,
            {active: path[0] === activePath[0]},
            {at: path},
          )
        }
      }

      insertText(text)
    }

    return editor
  }
}

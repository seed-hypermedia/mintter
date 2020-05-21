import {Editor, Transforms, Range, Point} from 'slate'
import {ReactEditor} from 'slate-react'

export function withSections() {
  return <T extends ReactEditor>(editor: T) => {
    const {deleteBackward} = editor

    editor.deleteBackward = (...args) => {
      const {selection} = editor
      if (selection && Range.isCollapsed(selection)) {
        const parent = Editor.above(editor, {
          match: n => n.type === 'section',
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

    return editor
  }
}

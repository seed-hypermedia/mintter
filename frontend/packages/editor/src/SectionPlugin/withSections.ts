import {
  Editor,
  Transforms,
  Range,
  Point,
  // Path,
  Element,
} from 'slate'
import {ReactEditor} from 'slate-react'

export function withSections() {
  return <T extends ReactEditor>(editor: T) => {
    const {deleteBackward, normalizeNode} = editor

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

    editor.normalizeNode = ([node, path]) => {
      const {selection} = editor

      if (selection && Element.isElement(node) && node.type === 'section') {
        // const domNode = ReactEditor.toDOMNode(editor, node)
        // console.log('editor.normalizeNode -> domNode', domNode)
        // if (domNode && Path.isDescendant(selection.anchor.path, path)) {
        // domNode.classList.add('bg-background-muted')
        // } else {
        // domNode.classList.remove('bg-background-muted')
        // }
        return
      }
      normalizeNode([node, path])
    }

    return editor
  }
}

import {
  Editor,
  // Element,
  Transforms,
  Range,
  Point,
  // Path,
} from 'slate'
import {ReactEditor} from 'slate-react'
import {nodeTypes} from '../nodeTypes'

export function withSections() {
  return <T extends ReactEditor>(editor: T) => {
    const {deleteBackward, insertText, insertBreak} = editor

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

      if (selection && Range.isCollapsed(selection)) {
        // check which section has focus
        const [, activePath = [0]]: any = Editor.above(editor, {
          match: n => {
            return n.type === 'section'
          },
        })

        for (const [, path] of Editor.nodes(editor, {
          at: [],
          match: n => n.type === nodeTypes.typeSection,
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

    editor.insertBreak = () => {
      const {selection} = editor

      if (selection && Range.isCollapsed(selection)) {
        const parent = Editor.above(editor, {
          match: n => n.type === nodeTypes.typeSection,
        })

        if (parent) {
          const [, parentPath] = parent
          const parentEnd = Editor.end(editor, parentPath)
          for (const [, path] of Editor.nodes(editor, {
            at: [],
            match: n => n.type === nodeTypes.typeSection,
          })) {
            Transforms.setNodes(editor, {active: false}, {at: path})
          }

          Transforms.insertNodes(
            editor,
            {
              type: nodeTypes.typeSection,
              active: true,
              children: [{type: nodeTypes.typeP, children: [{text: ''}]}],
            },
            {
              select: true,
              at: [parentEnd.path[0] + 1],
            },
          )

          return
        }
      }

      insertBreak()
    }

    return editor
  }
}

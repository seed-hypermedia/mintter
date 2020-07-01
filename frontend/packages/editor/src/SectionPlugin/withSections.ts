import {
  Editor,
  // Element,
  Transforms,
  Range,
  Point,
  Path,
} from 'slate'
import {isRangeAtRoot} from '@udecode/slate-plugins'
import {ReactEditor} from 'slate-react'
import {nodeTypes} from '../nodeTypes'

export function withSections() {
  return <T extends ReactEditor>(editor: T) => {
    const {
      deleteBackward,
      // insertText,
      insertBreak,
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

    // editor.insertText = (text: string) => {
    //   const {selection} = editor

    //   if (selection && Range.isCollapsed(selection)) {
    //     // check which section has focus
    //     const [, activePath = [0]]: any = Editor.above(editor, {
    //       match: n => {
    //         return n.type === 'section'
    //       },
    //     })

    //     for (const [, path] of Editor.nodes(editor, {
    //       at: [],
    //       match: n => n.type === nodeTypes.typeSection,
    //     })) {
    //       Transforms.setNodes(
    //         editor,
    //         {active: path[0] === activePath[0]},
    //         {at: path},
    //       )
    //     }
    //   }

    //   insertText(text)
    // }

    editor.insertBreak = () => {
      const {selection} = editor

      if (selection && !isRangeAtRoot(selection)) {
        const [paragraphNode, paragraphPath] = Editor.parent(editor, selection)

        if (paragraphNode.type === nodeTypes.typeP) {
          const [blockNode, blockPath] = Editor.parent(editor, paragraphPath)

          if (blockNode.type === nodeTypes.typeSection) {
            if (!Range.isCollapsed(selection)) {
              Transforms.delete(editor)
            }

            const start = Editor.start(editor, paragraphPath)
            const end = Editor.end(editor, paragraphPath)

            const isStart = Point.equals(selection.anchor, start)
            const isEnd = Point.equals(selection.anchor, end)

            const nextParagraphPath = Path.next(paragraphPath)
            const nextBlockPath = Path.next(blockPath)

            /**
             * If start, insert a list item before
             */
            if (isStart) {
              Transforms.insertNodes(
                editor,
                {
                  type: nodeTypes.typeSection,
                  children: [
                    {
                      type: nodeTypes.typeP,
                      children: [{text: ''}],
                    },
                  ],
                },
                {at: blockPath},
              )
              return
            }

            /**
             * If not end, split nodes, wrap a list item on the new paragraph and move it to the next list item
             */
            if (!isEnd) {
              Transforms.splitNodes(editor, {at: selection})
              Transforms.wrapNodes(
                editor,
                {
                  type: nodeTypes.typeSection,
                  children: [],
                },
                {
                  at: nextParagraphPath,
                },
              )
              Transforms.moveNodes(editor, {
                at: nextParagraphPath,
                to: nextBlockPath,
              })
            } else {
              /**
               * If end, insert a list item after and select it
               */
              Transforms.insertNodes(
                editor,
                {
                  type: nodeTypes.typeSection,
                  children: [
                    {
                      type: nodeTypes.typeP,
                      children: [{text: ''}],
                    },
                  ],
                },
                {at: nextBlockPath},
              )
              Transforms.select(editor, nextBlockPath)
            }

            return
          }
        }
      }

      insertBreak()
    }

    return editor
  }
}

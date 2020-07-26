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
import {ELEMENT_BLOCK, ELEMENT_PARAGRAPH} from '../elements'
// import {nodeTypes} from '../nodeTypes'

export function withSections() {
  return <T extends ReactEditor>(editor: T) => {
    const {
      // deleteBackward,
      // insertText,
      insertBreak,
    } = editor

    // editor.deleteBackward = (...args) => {
    //   const {selection} = editor
    //   if (selection && Range.isCollapsed(selection)) {
    //     const parent = Editor.above(editor, {
    //       match: n => n.type === nodeTypes.typeBlock,
    //     })

    //     if (parent) {
    //       const [, parentPath] = parent
    //       const parentStart = Editor.start(editor, parentPath)
    //       if (editor.children.length > 1) {
    //         if (Point.equals(selection.anchor, parentStart)) {
    //           Transforms.removeNodes(editor, {at: parentPath})

    //           return
    //         }
    //       }
    //     }
    //   }

    //   deleteBackward(...args)
    // }

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
    //       match: n => n.type === nodeTypes.typeBlock,
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
      // debugger
      console.log('Section insertBreak!!!')
      console.log('editor.insertBreak -> editor.selection', editor.selection)
      if (editor.selection && !isRangeAtRoot(editor.selection)) {
        const [parentNode, parentPath] = Editor.parent(editor, editor.selection)
        console.log(
          'editor.insertBreak -> parentNode, parentPath',
          parentNode,
          parentPath,
        )

        if (parentNode.type !== ELEMENT_BLOCK) {
          const [blockNode, blockPath] = Editor.parent(editor, parentPath)
          console.log(
            'editor.insertBreak -> blockNode, blockPath',
            blockNode,
            blockPath,
          )

          if (blockNode.type === ELEMENT_BLOCK) {
            console.log(
              'editor.insertBreak -> blockNode.type === ELEMENT_BLOCK',
              blockNode.type === ELEMENT_BLOCK,
            )
            if (!Range.isCollapsed(editor.selection)) {
              Transforms.delete(editor)
            }

            const blockStart = Editor.start(editor, blockPath)
            console.log('editor.insertBreak -> blockStart', blockStart)
            const blockEnd = Editor.end(editor, blockPath)
            console.log('editor.insertBreak -> blockEnd', blockEnd)

            const parentStart = Editor.start(editor, parentPath)
            console.log('editor.insertBreak -> parentStart', parentStart)
            const parentEnd = Editor.end(editor, parentPath)
            console.log('editor.insertBreak -> parentEnd', parentEnd)

            const isStart = Point.equals(editor.selection.anchor, blockStart)
            console.log('editor.insertBreak -> isStart', isStart)
            const isEnd = Point.equals(editor.selection.anchor, blockEnd)
            console.log('editor.insertBreak -> isEnd', isEnd)

            const nextParentPath = Path.next(parentPath)
            console.log('editor.insertBreak -> nextParentPath', nextParentPath)
            const nextBlockPath = Path.next(blockPath)
            console.log('editor.insertBreak -> nextBlockPath', nextBlockPath)

            const start = Editor.start(editor, parentPath)
            console.log('editor.insertBreak -> start', start)
            const end = Editor.end(editor, parentPath)
            console.log('editor.insertBreak -> end', end)

            const isParentStart = Point.equals(editor.selection.anchor, start)
            console.log('editor.insertBreak -> isParentStart', isParentStart)
            const isParentEnd = Point.equals(editor.selection.anchor, end)
            console.log('editor.insertBreak -> isParentEnd', isParentEnd)

            if (isStart && isEnd) {
              console.log('isStart && isEnd')
              Transforms.wrapNodes(
                editor,
                {type: ELEMENT_BLOCK, children: []},
                {at: parentPath},
              )
              Transforms.moveNodes(editor, {
                at: parentPath,
                to: nextBlockPath,
              })

              return
            }

            /**
             * If start, insert a list item before
             */
            if (isStart) {
              Transforms.insertNodes(
                editor,
                {
                  type: ELEMENT_BLOCK,
                  children: [
                    {
                      type: ELEMENT_PARAGRAPH,
                      children: [{text: ''}],
                    },
                  ],
                },
                {at: blockPath},
              )
              Transforms.select(editor, Editor.start(editor, blockPath))
              return
            }

            /**
             * If not end, split nodes, wrap a list item on the new paragraph and move it to the next list item
             */
            if (!isEnd) {
              /**
               * TODO: Horacio: Take all nodes below selection and move it to a new block below the current one
               */

              if (isParentStart && isParentEnd) {
                console.log(
                  'editor.insertBreak -> isParentStart && isParentEnd',
                )
                return
              }

              if (isParentStart) {
                console.log('editor.insertBreak -> isStart')
                Transforms.splitNodes(editor, {at: parentPath})
                return
              }

              if (!isParentEnd) {
                console.log('editor.insertBreak -> !isParentEnd')
                Transforms.splitNodes(editor)
                Transforms.splitNodes(editor, {at: nextParentPath})
                return
              } else {
                console.log(
                  'editor.insertBreak -> isParentEnd else',
                  isParentEnd,
                )
                Transforms.splitNodes(editor, {at: nextParentPath})
                Transforms.select(editor, Editor.start(editor, nextBlockPath))
                return
              }

              // Transforms.wrapNodes(
              //   editor,
              //   {
              //     type: ELEMENT_BLOCK,
              //     children: [],
              //   },
              //   {
              //     at: nextParentPath,
              //   },
              // )
              // Transforms.moveNodes(editor, {
              //   at: nextParentPath,
              //   to: nextBlockPath,
              // })
              console.log('is NOT END')
              return
            } else {
              /**
               * If end, insert a list item after and select it
               */
              // if (Editor.hasTexts(editor, parentNode)) {
              //   Transforms.splitNodes(editor, {at: parentPath})
              // } else {
              Transforms.insertNodes(
                editor,
                {
                  type: ELEMENT_BLOCK,
                  children: [
                    {
                      type: ELEMENT_PARAGRAPH,
                      children: [{text: ''}],
                    },
                  ],
                },
                {at: nextBlockPath},
              )
              // }

              Transforms.select(editor, Editor.start(editor, nextBlockPath))
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

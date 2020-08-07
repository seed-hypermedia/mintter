import {Editor, Transforms, Point, Path, Node} from 'slate'
import {
  isRangeAtRoot,
  isCollapsed,
  ELEMENT_IMAGE,
  isFirstChild,
  getBlockAbove,
} from '@udecode/slate-plugins'
import {ReactEditor} from 'slate-react'
import {v4 as uuid} from 'uuid'
import {ELEMENT_BLOCK, ELEMENT_PARAGRAPH} from '../elements'
// import {nodeTypes} from '../nodeTypes'

export function withBlocks() {
  return <T extends ReactEditor>(editor: T) => {
    const {
      // deleteBackward,
      // insertText,
      insertBreak,
      normalizeNode,
    } = editor

    editor.insertBreak = () => {
      if (editor.selection) {
        if (!isRangeAtRoot(editor.selection)) {
          console.log('editor.insertBreak -> insertBreak', insertBreak)
          const [parentNode, parentPath] = Editor.parent(
            editor,
            editor.selection,
          )

          if (parentNode.type !== ELEMENT_BLOCK) {
            const [blockNode, blockPath] = Editor.parent(editor, parentPath)

            if (blockNode.type === ELEMENT_BLOCK) {
              if (!isCollapsed(editor.selection)) {
                Transforms.delete(editor)
              }

              const blockStart = Editor.start(editor, blockPath)
              const blockEnd = Editor.end(editor, blockPath)
              const isStart = Point.equals(editor.selection.anchor, blockStart)
              const isEnd = Point.equals(editor.selection.anchor, blockEnd)
              const nextParentPath = Path.next(parentPath)
              const nextBlockPath = Path.next(blockPath)
              const start = Editor.start(editor, parentPath)
              const end = Editor.end(editor, parentPath)
              const isParentStart = Point.equals(editor.selection.anchor, start)
              const isParentEnd = Point.equals(editor.selection.anchor, end)

              if (isStart && isEnd) {
                // the node is empty
                Transforms.insertNodes(
                  editor,
                  {
                    type: ELEMENT_BLOCK,
                    id: uuid(),
                    children: [
                      {
                        type: ELEMENT_PARAGRAPH,
                        children: [{text: ''}],
                      },
                    ],
                  },
                  {at: nextBlockPath},
                )

                Transforms.select(editor, Editor.start(editor, nextBlockPath))
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
                    id: uuid(),
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
               * If not end, split nodes, wrap a list item on the new paragraph and move it to the next block item
               */
              if (!isEnd) {
                /**
                 * TODO: Horacio: Take all nodes below selection and move it to a new block below the current one
                 */

                if (isParentStart && isParentEnd) {
                  return
                }

                if (isParentStart) {
                  Transforms.splitNodes(editor, {at: parentPath})
                  // Transforms.setNodes(
                  //   editor,
                  //   {id: uuid()},
                  //   {at: nextBlockPath},
                  // )
                  return
                }

                if (!isParentEnd) {
                  Transforms.splitNodes(editor)
                  Transforms.splitNodes(editor, {at: nextParentPath})
                  return
                } else {
                  Transforms.splitNodes(editor, {at: nextParentPath})
                  Transforms.select(editor, Editor.start(editor, nextBlockPath))
                  return
                }
              } else {
                /**
                 * If end, insert a block item after and select it
                 */

                Transforms.insertNodes(
                  editor,
                  {
                    type: ELEMENT_BLOCK,
                    id: uuid(),
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
        } else {
          const parentBlock = Node.parent(editor, editor.selection.focus.path)
          if (parentBlock.type === ELEMENT_IMAGE) {
            const nextParentPath = Path.next(
              ReactEditor.findPath(editor, parentBlock),
            )
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
              {at: nextParentPath},
            )
            Transforms.select(editor, nextParentPath)
            return
          }
        }
      }

      insertBreak()
    }

    editor.normalizeNode = entry => {
      const [node, path] = entry
      /*
      - 
      */
      switch (path.length) {
        case 0:
          // is the editor
          console.log('normalize: EDITOR -> ', node)
          break
        case 1:
          // is the first child
          console.log('normalize: FIRST CHILD -> ', node)
          break
        case 2:
          // is the second child
          console.log('normalize: SECOND CHILD -> ', node)

          // check if element is the second child of a block, if so, move to the next block
          if (!isFirstChild(path)) {
            console.log('SECONDCHILD: not the first child!', {node, path})
            const parentBlock = getBlockAbove(editor, {at: path})

            if (parentBlock) {
              const [, parentPath] = parentBlock
              Transforms.splitNodes(editor, {at: parentPath})
              const nextParentPath = Path.next(parentPath)

              Transforms.moveNodes(editor, {at: path, to: nextParentPath})
              Transforms.wrapNodes(
                editor,
                {type: ELEMENT_BLOCK, id: uuid(), children: []},
                {at: nextParentPath},
              )
              Transforms.select(editor, nextParentPath)
              return
            }
          }
          break
        case 3:
          // is the editor
          console.log('normalize: THIRD CHILD -> ', node)
          break
        default:
          // unhandled node
          console.log('normalize: UNHANDLED NODE -> ', node)
          break
      }

      // Fall back to the original `normalizeNode` to enforce other constraints.
      normalizeNode(entry)
    }

    return editor
  }
}

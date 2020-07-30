import {Editor, Element, Transforms, Point, Path, Node} from 'slate'
import {isRangeAtRoot, isCollapsed} from '@udecode/slate-plugins'
import {ReactEditor} from 'slate-react'
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
      if (editor.selection && !isRangeAtRoot(editor.selection)) {
        const [parentNode, parentPath] = Editor.parent(editor, editor.selection)

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

    editor.normalizeNode = entry => {
      const [node, path] = entry
      if (!path.length) {
        if (Element.isElement(node) && node.type === ELEMENT_BLOCK) {
          for (const [child, childPath] of Node.children(editor, path)) {
            // If block has no children with type P, then wrap children with a P
            if (!child.type) {
              Transforms.wrapNodes(
                editor,
                {
                  type: ELEMENT_PARAGRAPH,
                  children: [],
                },
                {at: childPath},
              )
              return
              // If block has a children of type 'block', then unwraps it
            }
          }
        }
      }
      // Fall back to the original `normalizeNode` to enforce other constraints.
      normalizeNode(entry)
    }

    return editor
  }
}

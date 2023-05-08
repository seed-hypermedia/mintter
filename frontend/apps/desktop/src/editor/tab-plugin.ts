import {MintterEditor} from '@app/editor/mintter-changes/plugin'
import {
  isFlowContent,
  isGroupContent,
  isParent,
  GroupingContent,
  FlowContent,
  isHeading,
} from '@mintter/shared'
import {Editor, Node, NodeEntry, Path, PathRef, Transforms} from 'slate'
import type {EditorPlugin} from './types'
import {getSelectedNodes, NodeRef} from './utils'

/**
 * This plugin handles the <Tab> interactions with the editor:
 * A. If the users cursor is at the start of a statement, the statement is moved up or down the hierarchy
 * B. Or if the cursor is somewhere else, the Tab character gets inserted
 */
export const createTabPlugin = (): EditorPlugin => {
  return {
    name: 'tab',
    onKeyDown: (editor) => (e) => {
      if (e.key === 'Tab' && editor.selection) {
        e.preventDefault()
        moveStatement(editor, e.shiftKey)
      }
    },
  }
}

function moveStatement(editor: Editor, up: boolean) {
  if (!editor.selection) return

  const {anchor, focus} = editor.selection

  let startPath, endPath

  if (Path.isAfter(anchor.path, focus.path)) {
    startPath = focus.path
    endPath = anchor.path
  } else {
    startPath = anchor.path
    endPath = focus.path
  }

  const nodes = getSelectedNodes(editor, startPath, endPath)
  console.log(nodes)

  if (!nodes) throw new Error('found no parent statement')

  let isFirst = true
  for (const [index, node] of nodes.entries()) {
    const block = node.entry[0]
    const blockPath =
      node.pathRef && node.pathRef.current
        ? node.pathRef.current
        : node.entry[1]

    const [parentBlock, parentPath] = Editor.parent(editor, blockPath)
    if (isGroupContent(parentBlock)) {
      Editor.withoutNormalizing(editor, () => {
        MintterEditor.addChange(editor, ['moveBlock', block.id])
        MintterEditor.addChange(editor, ['replaceBlock', block.id])
        if (!up) {
          if (!isFirst && node.isChild) return
          const [prev, prevPath] =
            Editor.previous(editor, {
              at: blockPath,
            }) || []
          if (!prev || !prevPath || !isParent(prev)) return

          if (prev.children.length == 1) {
            Transforms.wrapNodes(
              editor,
              //@ts-ignore
              {type: parentBlock.type, children: []},
              {at: blockPath},
            )
            Transforms.moveNodes(editor, {
              at: blockPath,
              to: [...prevPath, 1],
            })
          } else {
            Transforms.moveNodes(editor, {
              at: blockPath,
              to: [
                ...prevPath,
                1,
                (prev.children[1] as GroupingContent).children.length,
              ],
            })
          }
          isFirst = false
        } else {
          // don't try to lift anything if we're already at the root level (with default group the root is depth 4)
          if (blockPath.length < 4 || (!isFirst && node.isChild)) return

          // don't lift if the parent is heading
          if (isHeading(Editor.parent(editor, parentPath)[0])) return

          const siblings = Array.from(nextSiblings(editor, blockPath))

          // don't re-parent anything if there are no siblins
          if (siblings.length) {
            const range = {
              anchor: Editor.start(editor, siblings[0][1]),
              focus: Editor.end(editor, siblings[siblings.length - 1][1]),
            }

            // if we don't have a group, wrap siblings and then move
            if (block?.children.length == 1) {
              Transforms.wrapNodes(
                editor,
                //@ts-ignore
                {
                  type: isGroupContent(parentBlock)
                    ? parentBlock.type
                    : 'group',
                  children: [],
                },
                {
                  match: (_, path) =>
                    siblings.some((s) => Path.equals(s[1], path)),
                  at: range,
                },
              )
              Transforms.moveNodes(editor, {
                at: Path.next(blockPath),
                to: [...blockPath, 1],
              })
            } else {
              Transforms.moveNodes(editor, {
                at: range,
                // moveNodes is recursive, but we only want to move nodes that are actually inside children, not any childrens children
                match: (_, path) =>
                  siblings.some((s) => Path.equals(s[1], path)),
                to: [...blockPath, 1, block?.children[1].children.length],
              })
            }

            siblings.forEach((entry) => {
              let [node] = entry
              if (isFlowContent(node)) {
                MintterEditor.addChange(editor, ['moveBlock', node.id])
                MintterEditor.addChange(editor, ['replaceBlock', node.id])
              }
            })
          }
          liftNode(editor, node)
          isFirst = false
        }
      })
    }
    if (node.pathRef) node.pathRef.unref()
  }
}

function* nextSiblings(editor: Editor, path: Path) {
  const parent = Path.parent(path)

  for (const entry of Node.children(editor, parent)) {
    if (Path.compare(entry[1], path) <= 0) continue
    yield entry
  }
}

function liftNode(editor: Editor, node: NodeRef) {
  const ref = node.pathRef
  if (!ref || node.entry[1] === ref.current) {
    Transforms.liftNodes(editor, {at: node.entry[1]})
    return
  }

  if (!ref || !ref.current) throw new Error('couldnt track path')
  Transforms.liftNodes(editor, {at: ref.current})
}

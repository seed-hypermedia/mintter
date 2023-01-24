import {MintterEditor} from '@app/editor/mintter-changes/plugin'
import {
  isFlowContent,
  isGroupContent,
  isParent,
  GroupingContent,
} from '@mintter/shared'
import {Editor, Node, Path, Transforms} from 'slate'
import type {EditorPlugin} from './types'

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

  const [statement, statementPath] =
    Editor.above(editor, {
      at: editor.selection,
      mode: 'lowest',
      match: isFlowContent,
    }) || []

  if (!statement || !statementPath) throw new Error('found no parent statement')

  const [parent] = Editor.parent(editor, statementPath)

  if (isGroupContent(parent)) {
    // IS GROUP, go ahead
    Editor.withoutNormalizing(editor, () => {
      MintterEditor.addChange(editor, ['moveBlock', statement.id])
      MintterEditor.addChange(editor, ['replaceBlock', statement.id])
      if (!up) {
        const [prev, prevPath] =
          Editor.previous(editor, {
            at: statementPath,
          }) || []

        if (!prev || !prevPath || !isParent(prev)) return

        if (prev.children.length == 1) {
          Transforms.wrapNodes(
            editor,
            {type: parent.type, children: []},
            {at: statementPath},
          )
          Transforms.moveNodes(editor, {
            at: statementPath,
            to: [...prevPath, 1],
          })
        } else {
          Transforms.moveNodes(editor, {
            at: statementPath,
            to: [
              ...prevPath,
              1,
              (prev.children[1] as GroupingContent).children.length,
            ],
          })
        }
      } else {
        // don't try to lift anything if we're already at the root level (with default group the root is depth 4)
        if (statementPath.length < 4) return

        const siblings = Array.from(nextSiblings(editor, statementPath))

        // don't re-parent anything if there are no siblins
        if (siblings.length) {
          const range = {
            anchor: Editor.start(editor, siblings[0][1]),
            focus: Editor.end(editor, siblings[siblings.length - 1][1]),
          }

          // if we don't have a group, wrap siblings and then move
          if (statement?.children.length == 1) {
            Transforms.wrapNodes(
              editor,
              {
                type: isGroupContent(parent) ? parent.type : 'group',
                children: [],
              },
              {
                match: (_, path) =>
                  siblings.some((s) => Path.equals(s[1], path)),
                at: range,
              },
            )

            Transforms.moveNodes(editor, {
              at: Path.next(statementPath),
              to: [...statementPath, 1],
            })
          } else {
            Transforms.moveNodes(editor, {
              at: range,
              // moveNodes is recursive, but we only want to move nodes that are actually inside children, not any childrens children
              match: (_, path) => siblings.some((s) => Path.equals(s[1], path)),
              to: [...statementPath, 1, statement?.children[1].children.length],
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

        doubleLift(editor, statementPath)
      }
    })
  }
}

function* nextSiblings(editor: Editor, path: Path) {
  const parent = Path.parent(path)

  for (const entry of Node.children(editor, parent)) {
    if (Path.compare(entry[1], path) <= 0) continue
    yield entry
  }
}

function doubleLift(editor: Editor, path: Path) {
  const ref = Editor.pathRef(editor, path)

  Transforms.liftNodes(editor, {at: path})
  if (!ref.current) throw new Error('couldnt track path')
  Transforms.liftNodes(editor, {at: ref.current})

  ref.unref()
}

import {MintterEditor} from '@app/editor/mintter-changes/plugin'
import {css} from '@app/stitches.config'
import {Box} from '@components/box'
import {
  createId,
  GroupingContent,
  isFlowContent,
  isGroup,
  isGroupContent,
  statement,
} from '@mintter/mttast'
import {forwardRef} from 'react'
import {Editor, Element, Node, NodeEntry, Transforms} from 'slate'
import {RenderElementProps} from 'slate-react'
import {debug} from 'tauri-plugin-log-api'
import {EditorMode} from '../plugin-utils'
import type {EditorPlugin} from '../types'
import {isFirstChild, resetGroupingContent} from '../utils'

export const ELEMENT_GROUP = 'group'

export const groupStyle = css({
  margin: 0,
  paddingLeft: 30,
  userSelect: 'none',
})

// export const GroupUI = styled('', groupStyle)

export const createGroupPlugin = (): EditorPlugin => ({
  name: ELEMENT_GROUP,
  renderElement:
    (editor) =>
    ({attributes, children, element}) => {
      if (isGroup(element)) {
        return (
          <Group mode={editor.mode} element={element} attributes={attributes}>
            {children}
          </Group>
        )
      }
    },
  configureEditor(editor) {
    if (editor.readOnly) return
    const {normalizeNode, deleteBackward} = editor

    editor.deleteBackward = (unit) => {
      if (resetGroupingContent(editor)) return

      deleteBackward(unit)
    }

    editor.normalizeNode = (entry) => {
      const [node, path] = entry

      if (Element.isElement(node) && isGroupContent(node)) {
        if (removeEmptyGroup(editor, entry)) return

        for (const [child, childPath] of Node.children(editor, path)) {
          // addParentData(editor, entry)

          // This rule is concerned with groups that are children of other groups
          // this happens when pasting nested lists from html and we want to explicitly handle it
          // this rule movesa group into the previous statement or unwraps it
          if (isGroupContent(child)) {
            if (isFirstChild(childPath)) {
              Transforms.unwrapNodes(editor, {at: childPath})
            } else {
              const [prev, prevPath] =
                Editor.previous(editor, {
                  at: childPath,
                }) || []

              if (prev && prevPath && isFlowContent(prev)) {
                if (isGroupContent(prev.children[1])) {
                  // we already have a group
                  Transforms.unwrapNodes(editor, {at: childPath})
                } else {
                  // we don't have a group

                  Transforms.moveNodes(editor, {
                    at: childPath,
                    to: prevPath.concat(1),
                  })
                }
              } else {
                Transforms.unwrapNodes(editor, {at: childPath})
              }
            }

            return
          }

          if (!isFlowContent(child)) {
            // inside group and not a flowcontent
            let blockId = createId()

            Transforms.wrapNodes(editor, statement({id: blockId}), {
              at: childPath,
            })
            MintterEditor.addChange(editor, ['moveBlock', blockId])
            MintterEditor.addChange(editor, ['replaceBlock', blockId])
            return
          }
        }
      }

      normalizeNode(entry)
    }

    return editor
  },
})

/**
 *
 * @param editor Editor
 * @param entry NodeEntry<GroupingContent>
 * @returns boolean | undefined
 *
 * when deleting statements we sometimes endup with empty groups. this methos removes them.
 */
export function removeEmptyGroup(
  editor: Editor,
  entry: NodeEntry<Node>,
): boolean | undefined {
  const [node, path] = entry
  if (isGroupContent(node)) {
    if (node.children.length == 1) {
      const children = Editor.node(editor, path.concat(0))
      if (!isFlowContent(children[0])) {
        debug(`removeEmptyGroup is about to remove nodes! ${path}`)

        Transforms.removeNodes(editor, {
          at: path,
        })
        return true
      }
    }
  }
}

export type GroupProps = Omit<RenderElementProps, 'element'> & {
  mode: EditorMode
  element: GroupingContent
}

export const Group = forwardRef<GroupProps, any>(
  ({mode, attributes, element, ...props}: GroupProps, ref) => {
    if (mode == EditorMode.Embed || mode == EditorMode.Mention) {
      return null
    }

    return (
      <Box
        as={
          element.type == 'unorderedList'
            ? 'ul'
            : element.type == 'orderedList'
            ? 'ol'
            : 'div'
        }
        className={groupStyle()}
        data-element-type={element.type}
        {...attributes}
        ref={ref as any}
        {...props}
      />
    )
  },
)

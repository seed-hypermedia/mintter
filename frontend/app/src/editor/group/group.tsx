import {MintterEditor} from '@app/editor/mintter-changes/plugin'
import {
  createId,
  GroupingContent,
  isFlowContent,
  isGroupContent,
  isOrderedList,
  ol,
  statement,
  ul,
} from '@mintter/shared'
import {useMemo} from 'react'
import {Editor, Element, Node, NodeEntry, Transforms} from 'slate'
import {RenderElementProps} from 'slate-react'
import {debug} from 'tauri-plugin-log-api'
import {EditorMode} from '../plugin-utils'
import type {EditorPlugin} from '../types'
import {isFirstChild, resetGroupingContent, toggleList} from '../utils'

export const ELEMENT_GROUP = 'group'
export const ELEMENT_ORDERED_LIST = 'orderedList'
export const ELEMENT_UNORDERED_LIST = 'unorderedList'

export const createGroupPlugin = (): EditorPlugin => ({
  name: ELEMENT_GROUP,
  renderElement:
    (editor) =>
    ({attributes, children, element}) => {
      if (isGroupContent(element)) {
        return (
          <Group mode={editor.mode} element={element} attributes={attributes}>
            {children}
          </Group>
        )
      }
    },
  onDOMBeforeInput: (editor) => (ev) => {
    if (
      (ev.inputType === 'insertUnorderedList' ||
        ev.inputType === 'insertOrderedList') &&
      editor.selection
    ) {
      ev.preventDefault()

      const [, path] =
        Editor.above(editor, {
          at: editor.selection,
          match: isFlowContent,
        }) || []

      if (!path) throw new Error('whut')

      const set = toggleList(
        {
          insertUnorderedList: ul,
          insertOrderedList: ol,
        }[ev.inputType],
      )

      set(editor, path)
    }
  },
  configureEditor(editor) {
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
    } else if (node.children.length === 0) {
      Transforms.removeNodes(editor, {
        at: path,
      })
      return true
    }
  }
}

export type GroupProps = Omit<RenderElementProps, 'element'> & {
  mode: EditorMode
  element: GroupingContent
}

export function Group({
  element,
  attributes,
  children,
  mode,
}: RenderElementProps & {mode: EditorMode; element: GroupingContent}) {
  let elementProps = useMemo(
    () => ({
      ...attributes,
      'data-element-type': (element as GroupingContent).type,
      start: isOrderedList(element) ? element.start : 1,
    }),
    [element, attributes],
  )

  let Component = useMemo(
    () => (isOrderedList(element) ? 'ol' : 'ul'),
    [element],
  )

  if (mode == EditorMode.Embed || mode == EditorMode.Mention) {
    return null
  }

  return <Component {...elementProps}>{children}</Component>
}

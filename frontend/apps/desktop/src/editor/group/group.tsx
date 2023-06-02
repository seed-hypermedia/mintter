import {
  GroupingContent,
  isFlowContent,
  isGroup,
  isGroupContent,
  isOrderedList,
  isUnorderedList,
  OrderedList,
} from '@mintter/shared'
import {YStack} from '@mintter/ui'
import {useMemo} from 'react'
import {Editor, Node, NodeEntry, Transforms} from 'slate'
import {RenderElementProps} from 'slate-react'
import {debug} from 'tauri-plugin-log-api'
import {EditorMode} from '../plugin-utils'
import {BLOCK_GAP} from '../utils'

export const ELEMENT_GROUP = 'group'
export const ELEMENT_ORDERED_LIST = 'orderedList'
export const ELEMENT_UNORDERED_LIST = 'unorderedList'

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
}: RenderElementProps & {mode: EditorMode}) {
  let elementProps = useMemo(
    () => ({
      ...attributes,
      'data-element-type': (element as GroupingContent).type,
      start: isUnorderedList(element)
        ? undefined
        : (element as OrderedList).start || 1,
    }),
    [element, attributes],
  )

  let tag = useMemo(() => (isOrderedList(element) ? 'ol' : 'ul'), [element])

  if (mode == EditorMode.Embed || mode == EditorMode.Mention) {
    return null
  }

  return (
    <YStack
      tag={tag}
      marginLeft={isGroup(element) ? 0 : -32}
      {...elementProps}
      gap={BLOCK_GAP}
      position="relative"
      // borderWidth={1}
      // borderColor="gray"
    >
      {children}
    </YStack>
  )
}

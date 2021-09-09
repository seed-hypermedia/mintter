import type {Ancestor, Descendant, NodeEntry, Point, Span} from 'slate'
import type {GroupingContent} from '@mintter/mttast'
import {Range, Editor, Path, Transforms, Text, Node} from 'slate'
import {isFlowContent, isGroup, isGroupContent, isStatement} from '@mintter/mttast'
import {group, statement} from '@mintter/mttast-builder'

export const isCollapsed = (range: Range): boolean => !!range && Range.isCollapsed(range)

export interface UnhangRangeOptions {
  at?: Range | Path | Point | Span
  voids?: boolean
  unhang?: boolean
}
/**
 * unhangRange:
 *
 * sometimes selections starts at the fvery start or end of other nodes.
 * this causes some troubles when transforming nodes.
 * `unhangRange` removes the remaining selection portion of a node in the selection.
 *
 * "Generally speaking, when the hanging option is false, the range will be trimmed so it doesn’t hang over a node boundary".
 * 
 * so if you have (in slate-hyperscript syntax):
 
* ```
 * <editor>
 *  <block>
 *    <anchor/>
 *    foo
 *  </block>
 *  <block>
 *    <focus/>
 *    bar
 *  </block>
 * </editor>
 * ```
 *
 * and you unhang the selection, you get
 *
 * ```
 * <editor>
 *  <block>
 *    <anchor/>
 *    foo
 *    <focus/>
 *  </block>
 *  <block>
 *    bar
 *  </block>
 * </editor>
 * ```
 *
 * so the selection isn’t hanging into the second block.
 *
 * */
export function unhangRange(editor: Editor, options: UnhangRangeOptions = {}) {
  const {at = editor.selection, voids, unhang = true} = options

  if (Range.isRange(at) && unhang) {
    options.at = Editor.unhangRange(editor, at, {voids})
  }
}

/**
 *
 * @param entry NodeEntry<Ancestor>
 * @returns Path
 *
 * This is important when normalizing groups if they are the last child of a node or not. that way we can do the appropiate transformations
 */
export function getLastChildPath(entry: NodeEntry<Ancestor>): Path {
  const lastChild = getLastChild(entry)
  if (!lastChild) return entry[1].concat([-1])

  return lastChild[1]
}

/**
 *
 * @param entry NodeEntry<Ancestor>
 * @returns NodeEntry<Descendant>
 *
 * we need to check the type of the last child of a statement to know where to move the new statement created.
 */
export function getLastChild(entry: NodeEntry<Ancestor>): NodeEntry<Descendant> | null {
  const [node, path] = entry
  if (!node.children.length) return null
  return [node.children[node.children.length - 1], path.concat([node.children.length - 1])]
}

/**
 *
 * @param parentEntry
 * @param childPath
 * @returns boolean
 *
 * before we check the last child type, we need to make sure the current statement path is not the last child. that way we are certain that the last child should be a group.
 */
export function isLastChild(parentEntry: NodeEntry<Ancestor>, childPath: Path): boolean {
  const lastChildPath = getLastChildPath(parentEntry)

  return Path.equals(lastChildPath, childPath)
}

export function isFirstChild(path: Path): boolean {
  return path[path.length - 1] == 0
}

export function toggleMark(
  editor: Editor,
  key: keyof Omit<Text, 'value'>,
  ...clears: Array<keyof Omit<Text, 'value'>>
): void {
  if (!editor.selection) return

  const isActive = isMarkActive(editor, key)

  Transforms.setNodes(
    editor,
    {
      [key]: isActive ? null : true,
    },
    {
      match: Text.isText,
      split: true,
    },
  )
}

export function isMarkActive(editor: Editor, key: keyof Omit<Text, 'value'>): boolean {
  const [match] = Editor.nodes(editor, {
    match: (n) => !!n[key],
    mode: 'all',
  })

  return !!match
}

export function removeMark(editor: Editor, key: keyof Omit<Text, 'value'>): void {
  const {selection} = editor
  if (selection) {
    if (Range.isExpanded(selection)) {
      Transforms.unsetNodes(editor, key, {
        match: Text.isText,
        split: true,
      })
    } else {
      const marks = {...(Editor.marks(editor) || {type: 'text'})}
      delete marks[key]
      editor.marks = marks
      editor.onChange()
    }
  }
}

export function resetFlowContent(editor: Editor): boolean | undefined {
  const {selection} = editor
  if (selection && isCollapsed(selection)) {
    const block = Editor.above(editor, {
      match: (n) => isFlowContent(n) && !isStatement(n),
    })

    if (block) {
      const [node, path] = block

      if (!Node.string(node.children[0])) {
        Editor.withoutNormalizing(editor, () => {
          Transforms.insertNodes(editor, statement({id: node.id}, node.children), {
            at: Path.next(path),
          })
          Transforms.removeNodes(editor, {at: path})
          Transforms.select(editor, path.concat(0))
        })
        return true
      }
    }
    return false
  }
}

export function resetGroupingContent(editor: Editor): boolean {
  const {selection} = editor
  if (selection && isCollapsed(selection)) {
    const list = Editor.above<GroupingContent>(editor, {
      match: (n) => isGroupContent(n) && !isGroup(n),
    })
    if (list) {
      const [listNode, listPath] = list
      if (!Node.string(listNode)) {
        Editor.withoutNormalizing(editor, () => {
          Transforms.insertNodes(editor, group(listNode.children), {at: Path.next(listPath)})
          Transforms.removeNodes(editor, {at: listPath})
          Transforms.select(editor, listPath.concat(0))
        })
        return true
      }
    }
  }
  return false
}

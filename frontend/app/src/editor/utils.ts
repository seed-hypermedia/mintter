import {isGroupContent} from '@mintter/mttast'
import type {Statement, GroupingContent} from '@mintter/mttast'
import {statement, paragraph, text, createId} from '@mintter/mttast-builder'
import {Range, Editor, Path, Transforms} from 'slate'
import type {BaseEditor, Ancestor, Descendant, NodeEntry, Point, Span} from 'slate'
import type {ReactEditor} from 'slate-react'

export type MTTEditor = BaseEditor & ReactEditor

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
export function unhangRange(editor: MTTEditor, options: UnhangRangeOptions = {}) {
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

/**
 *
 * @param editor MTTEditor
 * @param entry NodeEntry<GroupingContent>
 * @returns boolean | undefined
 *
 * when deleting statements we sometimes endup with empty groups. this methos removes them.
 */
export function removeEmptyGroup(editor: MTTEditor, entry: NodeEntry<GroupingContent>): boolean | undefined {
  const [node, path] = entry
  if (isGroupContent(node)) {
    if (node.children.length == 1) {
      const children = Editor.node(editor, path.concat(0))
      if (!children[0].type) {
        Transforms.removeNodes(editor, {
          at: path,
        })
        return true
      }
    }
  }
}

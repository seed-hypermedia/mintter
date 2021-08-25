import {Range, Editor, Path, Transforms, Text} from 'slate'
import type {BaseEditor, Ancestor, Descendant, NodeEntry, Point, Span} from 'slate'
import type {ReactEditor} from 'slate-react'
import type {HistoryEditor} from 'slate-history'

export type MTTEditor = BaseEditor & ReactEditor & HistoryEditor

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

export function isFirstChild(path: Path): boolean {
  return path[path.length - 1] == 0
}

export function toggleMark(editor: Editor, key: string) {
  if (!editor.selection) return

  if (!Editor.marks(editor)?.[key]) {
    editor.addMark(key, true)
  } else {
    const {selection} = editor
    if (selection) {
      if (Range.isExpanded(selection)) {
        console.log('selection expanded')

        Transforms.unsetNodes(editor, key, {
          match: Text.isText,
          split: true,
        })
      } else {
        console.log('selection collapsed')
        const marks = {...(Editor.marks(editor) || {})}
        delete marks[key]
        editor.marks = marks
      }
    }
  }
}

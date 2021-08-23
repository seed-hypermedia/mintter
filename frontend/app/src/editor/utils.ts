import {GroupingContent, isGroupContent, Statement} from '@mintter/mttast'
import {statement, paragraph, text, createId} from '@mintter/mttast-builder'
import {Range, Editor, Path, Ancestor, NodeEntry, Descendant} from 'slate'
import type {BaseEditor} from 'slate'
import type {ReactEditor} from 'slate-react'

export type MTTEditor = BaseEditor & ReactEditor

export function createStatement(): Statement {
  return statement([paragraph({id: createId()}, [text('')])])
}

export const isCollapsed = (range?: Range | null): boolean => !!range && Range.isCollapsed(range)

export const hasSelection = (editor: MTTEditor) => !!editor.selection

export const getParentFlowContent =
  (editor: MTTEditor) =>
  ({at = editor.selection, type} = {}) => {
    const parent = Editor.parent(editor, at, {
      depth: editor.selection?.anchor.path.length - 1,
    })
    const [node, path] = parent
    return node.type == type ? parent : null
  }

export const isRangeStart = (editor: MTTEditor) => (path: Path) =>
  !!editor.selection && path.length > 2 && Editor.isStart(editor, editor.selection.anchor, path)

export const isRangeEnd = (editor: MTTEditor) => (path: Path) =>
  !!editor.selection && path.length > 2 && Editor.isEnd(editor, editor.selection.focus, path)

export interface UnhangRangeOptions {
  at?: Range | Path | Point | Span
  voids?: boolean
  unhang?: boolean
}
export function unhangRange(editor: MTTEditor, options: UnhangRangeOptions = {}) {
  const {at = editor.selection, voids, unhang = true} = options

  if (Range.isRange(at) && unhang) {
    options.at = Editor.unhangRange(editor, at, {voids})
  }
}

export function getLastChildPath(entry: NodeEntry<Ancestor>): Path {
  const lastChild = getLastChild(entry)
  if (!lastChild) return entry[1].concat([-1])

  return lastChild[1]
}

export function getLastChild(entry: NodeEntry<Ancestor>): NodeEntry<Descendant> | null {
  const [node, path] = entry
  if (!node.children.length) return null
  return [node.children[node.children.length - 1], path.concat([node.children.length - 1])]
}

export function isLastChild(parentEntry: NodeEntry<Ancestor>, childPath: Path): boolean {
  const lastChildPath = getLastChildPath(parentEntry)

  return Path.equals(lastChildPath, childPath)
}

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

import type {Statement} from '@mintter/mttast'
import {statement, paragraph, text, createId} from '@mintter/mttast-builder'
import {Range, Editor, Path} from 'slate'
import type {BaseEditor} from 'slate'
import type {ReactEditor} from 'slate-react'

export type MTTEditor = BaseEditor & ReactEditor

export function createStatement(): Statement {
  return statement([paragraph({id: createId()}, [text('')])])
}

export const isCollapsed = (range: Range): boolean => !!range && Range.isCollapsed(range)

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

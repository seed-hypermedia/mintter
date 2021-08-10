import {isFlowContent, Statement} from '@mintter/mttast'
import {statement, paragraph, text, createId} from '@mintter/mttast-builder'
import {BaseEditor, BaseRange, BaseSelection, NodeEntry, Point, Range, Editor} from 'slate'
import type {ReactEditor} from 'slate-react'

type MTTEditor = BaseEditor & ReactEditor

export function createStatement(): Statement {
  return statement([paragraph([text('')])])
}

export type GetParentResult<T = Ancestor> = {
  isStart: boolean
  isEnd: boolean
  parent: NodeEntry<T>
}
export function getFlowContentParent<T = Statement | HeadingType | Blockquote>(
  editor: MTTEditor,
  selection: BaseSelection,
  parentType: 'heading' | 'statement' | 'blockquote' | undefined,
): GetParentResult<T> | undefined {
  const type = parentType ?? 'statement'

  const contentParentPath = selection?.focus.path.slice(0, selection?.focus.path.length - 2)

  const parent: NodeEntry<T> = Editor.above(editor, {
    match: (n) => isFlowContent(n),
    at: contentParentPath,
  })

  if (!parent) return

  const [node, path] = parent

  if (node.type != parentType) return

  const isStart = Editor.isStart(editor, selection.focus, [...path, 0])
  const isEnd = Editor.isEnd(editor, selection.focus, [...path, 0])
  console.log({selection, end: Editor.end(editor, path)})

  return {
    isStart,
    isEnd,
    parent,
  }
}

export function isEnd(editor: MTTEditor, point: Point, at: Location): boolean {
  !!point && Editor.isEnd(editor, point, at)
}

export function isCollapsed(range: unknown): range is Range {
  return Range.isCollapsed(range as BaseRange)
}

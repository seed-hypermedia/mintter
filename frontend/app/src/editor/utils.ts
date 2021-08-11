import {isFlowContent, Statement} from '@mintter/mttast'
import {statement, paragraph, text, createId} from '@mintter/mttast-builder'
import {BaseEditor, BaseRange, BaseSelection, NodeEntry, Point, Range, Editor, Element, Path} from 'slate'
import type {ReactEditor} from 'slate-react'
import {ELEMENT_HEADING} from './elements/heading'
import {ELEMENT_STATEMENT} from './elements/statement'

export type MTTEditor = BaseEditor & ReactEditor

export function createStatement(): Statement {
  return statement([paragraph([text('')])])
}

export const isCollapsed = (range: Range): boolean => !!range && Range.isCollapsed(range)

export const hasSelection = (editor: MTTEditor) => !!editor.selection

export const getParentFlowContent =
  (editor: MTTEditor) =>
  ({at, type} = {}) => {
    let above = Editor.above(editor, {
      at,
      match: (n) => !Editor.isEditor(n) && Element.isElement(n) && isFlowContent(n),
    })
    console.log('ABOVE: ', type, above, editor.selection)
    return above
  }

export const isRangeStart = (editor: MTTEditor) => (path: Path) =>
  !!editor.selection && path.length > 2 && Editor.isStart(editor, editor.selection.anchor, path)

export const isRangeEnd = (editor: MTTEditor) => (path: Path) =>
  !!editor.selection && path.length > 2 && Editor.isEnd(editor, editor.selection.focus, path)

export const isRangeMiddle = (editor: MTTEditor) => (path: Path) =>
  !!editor.selection && path.length > 2 && !isRangeStart(editor)(path) && !isRangeEnd(editor)(path)

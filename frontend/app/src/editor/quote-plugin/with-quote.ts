import {getAbove, isCollapsed} from '@udecode/slate-plugins'
import type {SPEditor, WithOverride} from '@udecode/slate-plugins-core'
import {Editor} from 'slate'
import type {ReactEditor} from 'slate-react'

export function withQuote(): WithOverride<ReactEditor & SPEditor> {
  return (editor) => {
    const {deleteBackward, deleteFragment} = editor

    editor.deleteBackward = (unit) => {
      if (editor.selection && isCollapsed(editor.selection)) {
        // console.log('quote deleteBackward!', unit)
        console.log({above: getAbove(editor, {})})
      }

      deleteBackward(unit)
    }

    editor.deleteFragment = (direction) => {
      console.log('quote deleteFragment!', direction)
      deleteFragment(direction)
    }

    return editor
  }
}

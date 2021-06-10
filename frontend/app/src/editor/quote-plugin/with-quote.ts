import type {SPEditor, WithOverride} from '@udecode/slate-plugins-core'
import type {ReactEditor} from 'slate-react'

export function withQuote(): WithOverride<ReactEditor & SPEditor> {
  return editor => {
    const {deleteBackward, deleteFragment} = editor

    editor.deleteBackward = unit => {
      console.log('quote deleteBackward!', unit)
      deleteBackward(unit)
    }

    editor.deleteFragment = direction => {
      console.log('quote deleteFragment!', direction)
      deleteFragment(direction)
    }

    return editor
  }
}

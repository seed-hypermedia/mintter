import type {EditorPlugin} from '../types'
import {toggleFormat} from '../utils'

export const MARK_STRONG = 'strong'

export const createStrongPlugin = (): EditorPlugin => ({
  name: MARK_STRONG,
  onDOMBeforeInput: (editor) => (ev) => {
    if (ev.inputType == 'formatBold') {
      ev.preventDefault()
      toggleFormat(editor, MARK_STRONG)
    }
  },
})

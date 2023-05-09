import type {EditorPlugin} from '../types'
import {toggleFormat} from '../utils'

export const MARK_UNDERLINE = 'underline'

export const createUnderlinePlugin = (): EditorPlugin => ({
  name: MARK_UNDERLINE,
  onDOMBeforeInput: (editor) => (ev) => {
    if (ev.inputType == 'formatUnderline') {
      ev.preventDefault()
      toggleFormat(editor, MARK_UNDERLINE)
    }
  },
})

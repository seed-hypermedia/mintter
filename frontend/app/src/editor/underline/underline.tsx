import type {EditorPlugin} from '../types'
import {toggleFormat} from '../utils'

export const MARK_UNDERLINE = 'underline'

export const createUnderlinePlugin = (): EditorPlugin => ({
  name: MARK_UNDERLINE,
  renderLeaf:
    () =>
    ({attributes, children, leaf}) => {
      if (leaf.underline) {
        return <u {...attributes}>{children}</u>
      }
    },
  onDOMBeforeInput: (editor) => (ev) => {
    if (ev.inputType == 'formatUnderline') {
      ev.preventDefault()
      toggleFormat(editor, MARK_UNDERLINE)
    }
  },
})

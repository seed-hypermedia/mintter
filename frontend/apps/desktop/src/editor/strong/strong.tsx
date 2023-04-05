import type {EditorPlugin} from '../types'
import {toggleFormat} from '../utils'

export const MARK_STRONG = 'strong'

export const createStrongPlugin = (): EditorPlugin => ({
  name: MARK_STRONG,
  renderLeaf:
    () =>
    ({attributes, children, leaf}) => {
      if (leaf.strong) {
        return <strong {...attributes}>{children}</strong>
      }
    },
  onDOMBeforeInput: (editor) => (ev) => {
    if (ev.inputType == 'formatBold') {
      ev.preventDefault()
      toggleFormat(editor, MARK_STRONG)
    }
  },
})

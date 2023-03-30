import type {EditorPlugin} from '../types'
import {toggleFormat} from '../utils'

export const MARK_EMPHASIS = 'emphasis'

export const createEmphasisPlugin = (): EditorPlugin => ({
  name: MARK_EMPHASIS,
  renderLeaf:
    () =>
    ({attributes, children, leaf}) => {
      if (leaf.emphasis) {
        return <em {...attributes}>{children}</em>
      }
    },
  onDOMBeforeInput: (editor) => (ev) => {
    if (ev.inputType == 'formatItalic') {
      ev.preventDefault()
      toggleFormat(editor, MARK_EMPHASIS)
    }
  },
})

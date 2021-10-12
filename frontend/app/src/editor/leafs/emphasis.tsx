import type {EditorPlugin} from '../types'
import {toggleMark} from '../utils'

export const MARK_EMPHASIS = 'emphasis'

export const createEmphasisPlugin = (): EditorPlugin => ({
  name: MARK_EMPHASIS,
  renderLeaf:
    () =>
    ({attributes, children, leaf}) => {
      if (leaf[MARK_EMPHASIS] && leaf.value) {
        return <em {...attributes}>{children}</em>
      }
    },
  onDOMBeforeInput: (editor) => (ev) => {
    if (ev.inputType == 'formatItalic') {
      ev.preventDefault()
      toggleMark(editor, MARK_EMPHASIS)
    }
  },
})

import type {Editor} from 'slate'
import type {EditorPlugin} from '../types'
import {toggleMark} from '../utils'

export const MARK_EMPHASIS = 'emphasis'

export function createEmphasisPlugin(): EditorPlugin {
  let editor: Editor
  return {
    name: MARK_EMPHASIS,
    configureEditor: (e) => (editor = e),
    renderLeaf({attributes, children, leaf}) {
      if (leaf[MARK_EMPHASIS] && leaf.value) {
        return <em {...attributes}>{children}</em>
      }
    },
    onDOMBeforeInput(ev) {
      if (ev.inputType === 'formatItalic') toggleMark(editor, MARK_EMPHASIS)
    },
  }
}

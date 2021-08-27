import type {Editor} from 'slate'
import type {EditorPlugin} from '../types'
import {toggleMark} from '../utils'

export const MARK_STRONG = 'strong'

export function createStrongPlugin(): EditorPlugin {
  let editor: Editor
  return {
    name: MARK_STRONG,
    configureEditor: (e) => (editor = e),
    renderLeaf({attributes, children, leaf}) {
      if (leaf[MARK_STRONG] && leaf.value) {
        return <strong {...attributes}>{children}</strong>
      }
    },
    onDOMBeforeInput(ev) {
      if (ev.inputType == 'formatBold') {
        ev.preventDefault()
        toggleMark(editor, MARK_STRONG)
      }
    },
  }
}

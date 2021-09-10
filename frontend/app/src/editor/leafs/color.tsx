import type {Editor} from 'slate'
import type {EditorPlugin} from '../types'
import {toggleMark} from '../utils'

export const MARK_COLOR = 'color'

export function createColorPlugin(): EditorPlugin {
  let editor: Editor
  return {
    name: MARK_COLOR,
    configureEditor: (e) => (editor = e),
    renderLeaf({attributes, children, leaf}) {
      if (leaf[MARK_COLOR] && leaf.value) {
        return (
          <span style={{color: leaf[MARK_COLOR]}} {...attributes}>
            {children}
          </span>
        )
      }
    },
    onDOMBeforeInput(ev) {
      if (ev.inputType == 'formatFontColor' && editor.selection) {
        ev.preventDefault()
        toggleMark(editor, 'color', ev.data)
      }
    },
  }
}

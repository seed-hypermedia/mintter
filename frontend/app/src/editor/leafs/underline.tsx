import {styled} from '@mintter/ui/stitches.config'
import type {Editor} from 'slate'
import type {EditorPlugin} from '../types'
import {toggleMark} from '../utils'

export const MARK_UNDERLINE = 'underline'

export const Underline = styled('span', {
  textDecoration: 'underline',
})

export function createUnderlinePlugin(): EditorPlugin {
  let editor: Editor
  return {
    name: MARK_UNDERLINE,
    configureEditor: (e) => (editor = e),
    renderLeaf({attributes, children, leaf}) {
      if (leaf[MARK_UNDERLINE] && leaf.value) {
        return <u {...attributes}>{children}</u>
      }
    },
    onDOMBeforeInput(ev) {
      if (ev.inputType === 'formatUnderline') toggleMark(editor, MARK_UNDERLINE)
    },
  }
}

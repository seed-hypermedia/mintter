import {Text, Transforms} from 'slate'
import type {EditorPlugin} from '../types'

export const MARK_COLOR = 'color'

export const createColorPlugin = (): EditorPlugin => ({
  name: MARK_COLOR,
  onDOMBeforeInput: (editor) => (ev) => {
    if (ev.inputType == 'formatFontColor' && editor.selection) {
      ev.preventDefault()

      Transforms.setNodes(
        editor,
        {color: ev.data ?? undefined},
        {match: Text.isText, split: true, mode: 'highest'},
      )
    }
  },
})

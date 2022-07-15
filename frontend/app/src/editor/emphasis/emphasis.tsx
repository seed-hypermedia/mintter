import {styled} from '@app/stitches.config'
import type {EditorPlugin} from '../types'
import {toggleFormat} from '../utils'

export const MARK_EMPHASIS = 'emphasis'

export const Emphasis = styled('em', {
  fontStyle: 'italic',
})

export const createEmphasisPlugin = (): EditorPlugin => ({
  name: MARK_EMPHASIS,
  renderLeaf:
    () =>
    ({attributes, children, leaf}) => {
      if (leaf[MARK_EMPHASIS] && leaf.value) {
        return <Emphasis {...attributes}>{children}</Emphasis>
      }
    },
  onDOMBeforeInput: (editor) => (ev) => {
    if (ev.inputType == 'formatItalic') {
      ev.preventDefault()
      toggleFormat(editor, MARK_EMPHASIS)
    }
  },
})

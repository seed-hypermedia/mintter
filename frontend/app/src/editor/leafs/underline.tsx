import {styled} from '@mintter/ui/stitches.config'
import type {EditorPlugin} from '../types'
import {toggleMark} from '../utils'

export const MARK_UNDERLINE = 'underline'

export const Underline = styled('span', {
  textDecoration: 'underline',
})

export const createUnderlinePlugin = (): EditorPlugin => ({
  name: MARK_UNDERLINE,
  renderLeaf:
    () =>
    ({attributes, children, leaf}) => {
      if (leaf[MARK_UNDERLINE] && leaf.value) {
        return <u {...attributes}>{children}</u>
      }
    },
  onDOMBeforeInput: (editor) => (ev) => {
    if (ev.inputType == 'formatUnderline') {
      ev.preventDefault()
      toggleMark(editor, MARK_UNDERLINE)
    }
  },
})

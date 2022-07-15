import {styled} from '@app/stitches.config'
import type {EditorPlugin} from '../types'
import {toggleFormat} from '../utils'

export const MARK_UNDERLINE = 'underline'

export const Underline = styled('u', {
  textDecoration: 'underline',
})

export const createUnderlinePlugin = (): EditorPlugin => ({
  name: MARK_UNDERLINE,
  renderLeaf:
    () =>
    ({attributes, children, leaf}) => {
      if (leaf[MARK_UNDERLINE] && leaf.value) {
        return <Underline {...attributes}>{children}</Underline>
      }
    },
  onDOMBeforeInput: (editor) => (ev) => {
    if (ev.inputType == 'formatUnderline') {
      ev.preventDefault()
      toggleFormat(editor, MARK_UNDERLINE)
    }
  },
})

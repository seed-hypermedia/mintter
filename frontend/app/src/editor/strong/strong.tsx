import {styled} from '@app/stitches.config'
import type {EditorPlugin} from '../types'
import {toggleMark} from '../utils'

export const MARK_STRONG = 'strong'

const Strong = styled('strong', {
  fontWeight: '$bold',
})

export const createStrongPlugin = (): EditorPlugin => ({
  name: MARK_STRONG,
  renderLeaf:
    () =>
    ({attributes, children, leaf}) => {
      if (leaf[MARK_STRONG] && leaf.value) {
        return <Strong {...attributes}>{children}</Strong>
      }
    },
  onDOMBeforeInput: (editor) => (ev) => {
    if (ev.inputType == 'formatBold') {
      ev.preventDefault()
      toggleMark(editor, MARK_STRONG)
    }
  },
})

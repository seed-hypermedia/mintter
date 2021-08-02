import {styled} from '@mintter/ui/stitches.config'
import type {EditorPlugin} from '../types'

export const MARK_UNDERLINE = 'underline'

export const Underline = styled('span', {
  textDecoration: 'underline',
})

export function createUnderlinePlugin(): EditorPlugin {
  return {
    key: MARK_UNDERLINE,
    renderLeaf({attributes, children, leaf}) {
      if (leaf[MARK_UNDERLINE] && leaf.value) {
        return <u {...attributes}>{children}</u>
      }
    },
  }
}

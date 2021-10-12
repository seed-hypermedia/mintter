import {styled} from '@mintter/ui/stitches.config'
import type {EditorPlugin} from '../types'

export const MARK_SUPERSCRIPT = 'superscript'

export const Superscript = styled('i', {
  verticalAlign: 'super',

  fontSize: '$1',
})

export function createSuperscriptPlugin(): EditorPlugin {
  return {
    name: MARK_SUPERSCRIPT,
    renderLeaf:
      () =>
      ({attributes, children, leaf}) => {
        if (leaf[MARK_SUPERSCRIPT] && leaf.value) {
          return <Superscript {...attributes}>{children}</Superscript>
        }
      },
  }
}

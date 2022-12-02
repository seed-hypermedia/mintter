import {styled} from '@app/stitches.config'
import type {EditorPlugin} from '../types'

export const MARK_SUPERSCRIPT = 'superscript'

export const Superscript = styled('sup', {})

export function createSuperscriptPlugin(): EditorPlugin {
  return {
    name: MARK_SUPERSCRIPT,
    renderLeaf:
      () =>
      ({attributes, children, leaf}) => {
        if (leaf[MARK_SUPERSCRIPT] && leaf.text) {
          return <Superscript {...attributes}>{children}</Superscript>
        }
      },
  }
}

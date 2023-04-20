import {SizableText} from '@mintter/ui'
import type {EditorPlugin} from '../types'

export const MARK_SUPERSCRIPT = 'superscript'

export function createSuperscriptPlugin(): EditorPlugin {
  return {
    name: MARK_SUPERSCRIPT,
    renderLeaf:
      () =>
      ({attributes, children, leaf}) => {
        if (leaf[MARK_SUPERSCRIPT] && leaf.text) {
          return (
            <SizableText tag="sup" {...attributes}>
              {children}
            </SizableText>
          )
        }
      },
  }
}

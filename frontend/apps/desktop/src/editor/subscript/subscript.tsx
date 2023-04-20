import {SizableText} from '@mintter/ui'
import type {EditorPlugin} from '../types'

export const MARK_SUBSCRIPT = 'subscript'

export function createSubscriptPlugin(): EditorPlugin {
  return {
    name: MARK_SUBSCRIPT,
    renderLeaf:
      () =>
      ({attributes, children, leaf}) => {
        if (leaf[MARK_SUBSCRIPT] && leaf.text) {
          return (
            <SizableText tag="sub" {...attributes}>
              {children}
            </SizableText>
          )
        }
      },
  }
}

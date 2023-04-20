import {SizableText} from '@mintter/ui'
import type {EditorPlugin} from '../types'

export const MARK_STRIKETHROUGH = 'strikethrough'

export const createStrikethroughPlugin = (): EditorPlugin => ({
  name: MARK_STRIKETHROUGH,
  renderLeaf:
    () =>
    ({attributes, children, leaf}) => {
      if (leaf[MARK_STRIKETHROUGH] && leaf.text) {
        return (
          <SizableText tag="s" {...attributes}>
            {children}
          </SizableText>
        )
      }
    },
})

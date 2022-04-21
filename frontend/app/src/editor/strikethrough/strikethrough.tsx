import {styled} from '@app/stitches.config'
import type {EditorPlugin} from '../types'

export const MARK_STRIKETHROUGH = 'strikethrough'

export const Strikethrough = styled('span', {})

export const createStrikethroughPlugin = (): EditorPlugin => ({
  name: MARK_STRIKETHROUGH,
  renderLeaf:
    () =>
    ({attributes, children, leaf}) => {
      if (leaf[MARK_STRIKETHROUGH] && leaf.value) {
        return <Strikethrough {...attributes}>{children}</Strikethrough>
      }
    },
})

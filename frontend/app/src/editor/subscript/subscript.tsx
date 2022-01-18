import {styled} from '@app/stitches.config'
import type {EditorPlugin} from '../types'

export const MARK_SUBSCRIPT = 'subscript'

export const Subscript = styled('i', {
  verticalAlign: 'sub',
  fontSize: '$1',
})

export function createSubscriptPlugin(): EditorPlugin {
  return {
    name: MARK_SUBSCRIPT,
    renderLeaf:
      () =>
      ({attributes, children, leaf}) => {
        if (leaf[MARK_SUBSCRIPT] && leaf.value) {
          return <Subscript {...attributes}>{children}</Subscript>
        }
      },
  }
}

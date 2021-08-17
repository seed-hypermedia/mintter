import type {EditorPlugin} from '../types'

export const MARK_STRONG = 'strong'

export function createStrongPlugin(): EditorPlugin {
  return {
    key: MARK_STRONG,
    renderLeaf({attributes, children, leaf}) {
      if (leaf[MARK_STRONG] && leaf.value) {
        return <strong {...attributes}>{children}</strong>
      }
    },
  }
}

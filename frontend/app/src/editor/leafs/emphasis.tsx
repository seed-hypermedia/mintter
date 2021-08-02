import type {EditorPlugin} from '../types'

export const MARK_EMPHASIS = 'emphasis'

export function createEmphasisPlugin(): EditorPlugin {
  return {
    key: MARK_EMPHASIS,
    renderLeaf({attributes, children, leaf}) {
      if (leaf[MARK_EMPHASIS] && leaf.value) {
        return <em {...attributes}>{children}</em>
      }
    },
  }
}

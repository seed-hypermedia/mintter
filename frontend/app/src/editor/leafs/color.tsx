import type {EditorPlugin} from '../types'

export const MARK_COLOR = 'color'

export function createColorPlugin(): EditorPlugin {
  return {
    name: MARK_COLOR,
    renderLeaf({attributes, children, leaf}) {
      if (leaf[MARK_COLOR] && leaf.value) {
        return (
          <span style={{color: leaf[MARK_COLOR]}} {...attributes}>
            {children}
          </span>
        )
      }
    },
  }
}

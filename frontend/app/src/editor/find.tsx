import {isParagraph} from '@mintter/mttast'
import {createContext, useContext} from 'react'
import {Node, Point, Range} from 'slate'
import {EditorPlugin} from './types'

const FIND_HIGHLIGHT = 'find-highlight'

export const findContext = createContext({
  search: '',
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  setSearch: () => {},
})
export const FindContextProvider = findContext.Provider

export function createFindPlugin(): EditorPlugin {
  return {
    name: 'find',
    renderLeaf:
      () =>
      ({attributes, children, leaf}) => {
        if (leaf[FIND_HIGHLIGHT] && leaf.value) {
          return (
            <span className={FIND_HIGHLIGHT} {...attributes}>
              {children}
            </span>
          )
        }
      },
    decorate: () => (entry) => {
      const [node, path] = entry
      let ranges: Range[] = []

      const {search} = useContext(findContext)
      if (!search) return
      const re = new RegExp(search, 'gi')

      if (isParagraph(node)) {
        const str = Node.string(node)

        let match
        while ((match = re.exec(str))) {
          const anchor = lowerPoint(node, {path, offset: match.index})
          const focus = lowerPoint(node, {path, offset: re.lastIndex})

          if (!anchor || !focus) {
            throw new Error('failed to lower point')
          }

          ranges.push({
            anchor,
            focus,
            [FIND_HIGHLIGHT]: true,
          })
        }
      }

      return ranges
    },
  }
}

function lowerPoint(root: Node, point: Point): Point | null {
  let offset = 0
  for (const [text, path] of Node.texts(root)) {
    if (offset <= point.offset && point.offset <= offset + text.value.length) {
      return {path: [...point.path, ...path], offset: point.offset - offset}
    }

    offset += text.value.length
  }

  return null
}

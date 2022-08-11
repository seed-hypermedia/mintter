import {isParagraph} from '@mintter/mttast'
import {createContext, useContext} from 'react'
import {Node, Point, Range} from 'slate'
import {EditorPlugin} from './types'

const SEARCH_HIGHLIGHT = 'search-highlight'

export const searchTerm = createContext({
  search: '',
  setSearch:
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    () => {},
})
export const SearchTermProvider = searchTerm.Provider

export function createSearchPlugin(): EditorPlugin {
  return {
    name: 'search',
    renderLeaf:
      () =>
      ({attributes, children, leaf}) => {
        if (leaf[SEARCH_HIGHLIGHT] && leaf.value) {
          return (
            <span
              style={{backgroundColor: 'rgb(244, 229, 178)'}}
              {...attributes}
            >
              {children}
            </span>
          )
        }
      },
    decorate: () => (entry) => {
      const [node, path] = entry
      let ranges: Range[] = []

      const {search} = useContext(searchTerm)
      if (!search) return
      const re = new RegExp(search, 'g')

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
            [SEARCH_HIGHLIGHT]: true,
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

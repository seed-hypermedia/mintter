import {isParagraph} from '@app/mttast'
import {createContext, useContext} from 'react'
import {Node, Range} from 'slate'
import {EditorPlugin} from './types'
import {lowerPoint} from './utils'

const FIND_HIGHLIGHT = 'find-highlight'

export const findContext = createContext({
  search: '',
  // eslint-disable-next-line
  setSearch: (v: string) => {},
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
      let ranges: Array<Range & {[FIND_HIGHLIGHT]: boolean}> = []

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

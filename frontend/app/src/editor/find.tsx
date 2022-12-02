import {isParagraph} from '@app/mttast'
import {Icon} from '@components/icon'
import {listen} from '@tauri-apps/api/event'
import {createContext, useContext, useEffect, useRef} from 'react'
import {Node, Range} from 'slate'
import '../styles/find.scss'
import {EditorPlugin} from './types'
import {lowerPoint} from './utils'

const FIND_HIGHLIGHT = 'find-highlight'

export function Find() {
  const {search, setSearch} = useContext(findContext)
  const searchInput = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    let unlisten: () => void | undefined

    listen('open_find', () => {
      searchInput.current?.focus()
    }).then((f) => (unlisten = f))

    return () => unlisten?.()
  })

  useEffect(() => {
    let input = searchInput.current
    if (input) {
      document.addEventListener('keydown', listenToSelectAll)
    }

    return () => {
      document.removeEventListener('keydown', listenToSelectAll)
    }

    function listenToSelectAll(event: KeyboardEvent) {
      if (event.metaKey && event.key == 'a') {
        if (input && document.activeElement === input) {
          event.preventDefault()
          input.select()
        }
      }
    }
  }, [searchInput])

  return (
    <label className="titlebar-search">
      <Icon name="Search" />
      <input
        ref={searchInput}
        type="search"
        autoCorrect="off"
        placeholder="Search"
        value={search}
        onInput={(e) => setSearch(e.currentTarget.value)}
      />
    </label>
  )
}

export var findContext = createContext({
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

export function useFind() {
  let context = useContext(findContext)

  if (!context) {
    throw new Error(`useFind must be called inside a FindContextProvider`)
  }

  return context
}

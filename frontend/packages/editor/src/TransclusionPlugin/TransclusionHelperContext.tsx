import React, {createContext, useContext, useCallback, useState} from 'react'
import {
  Path,
  Range,
  Editor,
  // Transforms, Node
} from 'slate'
import {
  getNextIndex,
  getPreviousIndex,
  // getText,
  // isCollapsed,
  // isWordAfterTrigger,
  // isPointAtWordEnd,
} from '@udecode/slate-plugins'

export const TransclusionHelperContext: any = createContext<any>({
  search: '',
  index: 0,
  target: null,
  values: [],
})

export function TransclusionHelperProvider({children, options, destination}) {
  console.log({destination})
  const [targetRange, setTargetRange] = useState<Range | null>(null)
  const [valueIndex, setValueIndex] = useState(0)
  // FIXME: add types to element
  const [element, setElement] = useState<any>(null)
  //   const [search, setSearch] = useState('')
  const [, setTargetPath] = useState<Path | null>(null)
  //   const values = options?.filter(o =>
  //     o.name.toLowerCase().includes(search.toLowerCase()),
  //   )
  const values = options

  const onTranscludeBlock = useCallback(
    (editor: Editor, draft) => {
      if (targetRange !== null) {
        console.log('transclude block!', {editor, draft, element})
        if (draft.isNew) {
          // create a new Draft with Transclusion
        }
        setTargetRange(null)
        setTargetPath(null)
        setElement(null)
        return
      }
    },
    [targetRange, element],
  )

  const setTarget = useCallback(
    (target, blockPath, element) => {
      setTargetRange(target)
      setTargetPath(blockPath)
      setElement(element)
    },
    [setTargetRange, setTargetPath, setElement],
  )

  const onKeyDownHelper = useCallback(
    (e: any, editor: Editor) => {
      if (targetRange) {
        if (e.key === 'ArrowDown') {
          e.preventDefault()
          return setValueIndex(getNextIndex(valueIndex, values.length - 1))
        }

        if (e.key === 'ArrowUp') {
          e.preventDefault()
          return setValueIndex(getPreviousIndex(valueIndex, values.length - 1))
        }

        if (e.key === 'Escape') {
          e.preventDefault()
          setTargetPath(null)
          return setTargetRange(null)
        }

        if (['Tab', 'Enter'].includes(e.key)) {
          e.preventDefault()
          return onTranscludeBlock(editor, values[valueIndex])
        }
      }
    },
    [
      values,
      valueIndex,
      setValueIndex,
      targetRange,
      setTargetRange,
      onTranscludeBlock,
    ],
  )

  //   const onChangeHelper = useCallback(
  //     (editor: Editor) => {
  //       const {selection} = editor

  //       if (selection && isCollapsed(selection)) {
  //         const cursor = Range.start(selection)
  //         const [, parentPath] = Editor.parent(editor, selection)

  //         const val = getText(editor, parentPath)
  //         if (val === trigger) {
  //           setTargetRange(selection)
  //           setSearch('')
  //           setValueIndex(0)
  //           return
  //         } else {
  //           setTargetRange(null)
  //         }

  //         const {range, match: beforeMatch} = isWordAfterTrigger(editor, {
  //           at: cursor,
  //           trigger,
  //         })

  //         if (beforeMatch && isPointAtWordEnd(editor, {at: cursor})) {
  //           setTargetRange(range as Range)
  //           const [, word] = beforeMatch
  //           setSearch(word)
  //           setValueIndex(0)
  //           return
  //         }
  //       }

  //       setTargetRange(null)
  //     },
  //     [setTargetRange, setSearch, setValueIndex, trigger],
  //   )

  return (
    <TransclusionHelperContext.Provider
      value={{
        // search,
        index: valueIndex,
        target: targetRange,
        setTarget,
        setValueIndex,
        values,
        // onChangeHelper,
        onKeyDownHelper,
        onTranscludeBlock,
      }}
    >
      {children}
    </TransclusionHelperContext.Provider>
  )
}

export function useTransclusionHelper(): any {
  return useContext(TransclusionHelperContext)
}

import React, {createContext, useContext, useCallback, useState} from 'react'
import {
  Path,
  Range,
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

export function TransclusionHelperProvider({
  children,
  options,
  handleTransclusion,
}) {
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
    destination => {
      if (targetRange !== null) {
        handleTransclusion({
          destination,
          block: element,
        })
        setTargetRange(null)
        setTargetPath(null)
        setElement(null)
        return
      }
    },
    [targetRange, element, handleTransclusion],
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
    (e: any) => {
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
          return onTranscludeBlock(values[valueIndex])
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

  const value = {
    // search,
    index: valueIndex,
    target: targetRange,
    setTarget,
    setValueIndex,
    values,
    // onChangeHelper,
    onKeyDownHelper,
    onTranscludeBlock,
  }

  return (
    <TransclusionHelperContext.Provider value={value}>
      {children}
    </TransclusionHelperContext.Provider>
  )
}

export function useTransclusionHelper(): any {
  const context = useContext(TransclusionHelperContext)
  if (context === undefined) {
    throw new Error(`useMintter must be used within a MintterProvider`)
  }

  return context
}
